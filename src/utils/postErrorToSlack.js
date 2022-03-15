import Auth from '@aws-amplify/auth';
import { getLoggerBotToken } from 'utils/crypt';

const extractExperimentId = (url) => {
  const match = url.match(/experiments\/([^/]+)/i);
  return match ? match[1] : null;
};

const takeNumLines = (string, numLines) => string.split('\n').slice(0, numLines).join('\n');

const buildErrorMessage = (error, componentStack, reduxDump, context) => {
  const {
    user, timestamp, experimentId, url,
  } = context;

  return (`
    Uncaught UI Error - Exp ID ${experimentId} - ${timestamp}

    === DETAILS ===
    User: ${user.attributes.name} <${user.attributes.email}> ${user.username}
    ExperimentID: ${experimentId}
    URL: ${url}
    Timestamp: ${timestamp}

    ===== ERROR =====
    ${error.toString()}
    ${takeNumLines(componentStack, 11)}

    ===== REDUX STATE =====
    ${JSON.stringify(reduxDump, null, 2)}`
  );
};

const postError = async (errorLog, context) => {
  const {
    user, timestamp, experimentId, url,
  } = context;

  const message = `
  \u26A0  Uncaught UI Error - ExpID ${experimentId} - ${timestamp}
  URL: ${url}

  User: ${user.attributes.name} <${user.attributes.email}> ${user.username}
  Experiment ID: ${experimentId}`;

  const formData = new FormData();

  const formFields = {
    token: getLoggerBotToken(),
    title: `UI Error at ${new Date().toISOString()}`,
    initial_comment: message,
    channels: 'error-logs',
    filename: `UI-error-${experimentId}-${timestamp}.log`,
    content: errorLog,
  };

  Object.entries(formFields).forEach(([fieldName, value]) => {
    formData.append(fieldName, value);
  });

  try {
    const res = await fetch('https://slack.com/api/files.upload', {
      method: 'POST',
      body: formData,
    });

    console.log('res', res);

    if (!res.ok) {
      throw new Error(
        `Failed sending error message to Slack: ${res.status}`, res.statusText,
      );
    }
  } catch (err) {
    console.error(err);
  }
};

const postErrorToSlack = async (error, info, reduxDump) => {
  // Only log errors to Slack if in production.
  if (process.env.NODE_ENV !== 'production') return;

  const user = await Auth.currentAuthenticatedUser();

  const timestamp = new Date().toISOString();
  const url = window.location.href;
  const experimentId = extractExperimentId(url);
  const { componentStack } = info;

  const context = {
    user,
    timestamp,
    experimentId,
    url,
  };

  const errorLog = buildErrorMessage(error, componentStack, reduxDump, context);
  await postError(errorLog, context);
};

export default postErrorToSlack;
