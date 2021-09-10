// File containing data-test id and class values for use in Cypress tests.

const ids = {
  NAVIGATION_MENU: 'navigation-menu',
  CONFIRM_CREATE_NEW_PROJECT: 'confirm-create-new-project',
  CREATE_NEW_PROJECT_BUTTON: 'create-new-project-button',
  PROJECT_NAME: 'project-name',
  PROJECT_DESCRIPTION: 'project-description',
  LAUNCH_ANALYSIS_BUTTON: 'launch-analysis-button',
  QC_STATUS_TEXT: 'qc-status-text',
};

const classes = {
  PAGE_HEADER: 'data-test-page-header',
  LAUNCH_ANALYSIS_ITEM: 'data-test-launch-analysis-item',
  NEW_PROJECT_MODAL: 'data-test-new-project-modal',
  DELETE_PROJECT_MODAL: 'data-test-delete-project-modal',
  SAMPLE_CELL: 'data-test-sample-cell',
  PROJECT_CARD: 'data-test-project-card',
  QC_STEP_COMPLETED: 'data-test-qc-step-completed',
  QC_STEP_NOT_COMPLETED: 'data-test-qc-step-not-completed',
};

export default {
  ids,
  classes,
};