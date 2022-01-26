/* eslint-disable global-require */
import { fetchWork } from 'utils/work/fetchWork';
import Environment from 'utils/environment';

const {
  mockGeneExpressionData,
  mockGenesListData,
  mockCacheKeyMappings,
  mockCacheGet,
  mockCacheSet,
  mockDispatchWorkRequest,
  mockSeekFromS3,
  mockReduxState,
} = require('__test__/utils/work/fetchWork.mock');

jest.mock('utils/cache', () => require('__test__/utils/work/fetchWork.mock').mockCacheModule);
jest.mock('utils/work/seekWorkResponse', () => require('__test__/utils/work/fetchWork.mock').mockSeekWorkResponseModule);

const experimentId = '1234';
const NON_GENE_EXPRESSION_ETAG = '013c3026bb7156d222ccd18919745195'; // pragma: allowlist secret
const GENE_EXPRESSION_ETAG = '34c05c9d07fd24ce0c22d2bec7fd7437'; // pragma: allowlist secret
const timeout = 10;

const nonGeneExpressionWorkRequest = {
  name: 'ListGenes',
};

const geneExpressionWorkRequest = {
  name: 'GeneExpression',
  genes: ['A', 'B', 'C', 'D'],
};

describe('fetchWork', () => {
  beforeEach(async () => {
    Storage.prototype.setItem = jest.fn();

    jest.clearAllMocks();

    mockSeekFromS3
      .mockReset()
      .mockImplementationOnce(() => null)
      .mockImplementationOnce(() => mockGenesListData);
  });

  it('runs correctly for gene expression work request', async () => {
    mockSeekFromS3
      .mockReset()
      .mockImplementationOnce(() => null)
      .mockImplementation(() => ({ D: mockGeneExpressionData.D }));

    const res = await fetchWork(
      experimentId,
      geneExpressionWorkRequest,
      mockReduxState(experimentId),
      { timeout },
    );

    expect(mockDispatchWorkRequest).toHaveBeenCalledWith(
      experimentId,
      { name: 'GeneExpression', genes: ['D'] },
      timeout,
      GENE_EXPRESSION_ETAG,
      expect.anything(),
    );
    expect(mockCacheGet).toHaveBeenCalledTimes(4);
    expect(mockCacheSet).toHaveBeenCalledTimes(1);
    expect(mockCacheSet).toHaveBeenCalledWith(mockCacheKeyMappings.D, mockGeneExpressionData.D);
    expect(res).toEqual({ D: mockGeneExpressionData.D });
  });

  it('runs correctly for non gene expression work request', async () => {
    const res = await fetchWork(
      experimentId,
      nonGeneExpressionWorkRequest,
      mockReduxState(experimentId),
      { timeout: 10 },
    );

    expect(mockDispatchWorkRequest).toHaveBeenCalledWith(
      experimentId,
      nonGeneExpressionWorkRequest,
      timeout,
      NON_GENE_EXPRESSION_ETAG,
      expect.anything(),
    );
    expect(mockCacheGet).toHaveBeenCalledTimes(1);
    expect(mockCacheSet).toHaveBeenCalledTimes(1);
    expect(mockCacheSet).toHaveBeenCalledWith(NON_GENE_EXPRESSION_ETAG, mockGenesListData);
    expect(res).toEqual(mockGenesListData);
  });

  it('does not change ETag if caching is enabled', async () => {
    Storage.prototype.getItem = jest.fn((key) => (key === 'disableCache' ? 'false' : null));

    await fetchWork(
      experimentId,
      nonGeneExpressionWorkRequest,
      mockReduxState(experimentId),
      { timeout },
    );

    expect(mockDispatchWorkRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      NON_GENE_EXPRESSION_ETAG,
      expect.anything(),
    );
  });

  it('changes ETag if caching is disabled', async () => {
    Storage.prototype.getItem = jest.fn((key) => (key === 'disableCache' ? 'true' : null));

    await fetchWork(
      experimentId,
      nonGeneExpressionWorkRequest,
      mockReduxState(experimentId),
      { timeout },
    );

    expect(mockDispatchWorkRequest).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      NON_GENE_EXPRESSION_ETAG,
      expect.anything(),
    );
  });

  it('Caching is disabled by default if environment is dev', async () => {
    await fetchWork(
      experimentId,
      nonGeneExpressionWorkRequest,
      mockReduxState(experimentId, Environment.DEVELOPMENT),
      { timeout },
    );

    expect(mockDispatchWorkRequest).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      NON_GENE_EXPRESSION_ETAG,
      expect.anything(),
    );
  });

  it('Setting cache to false in development enables cache', async () => {
    Storage.prototype.getItem = jest.fn((key) => (key === 'disableCache' ? 'false' : null));

    await fetchWork(
      experimentId,
      nonGeneExpressionWorkRequest,
      mockReduxState(experimentId, Environment.DEVELOPMENT),
      { timeout },
    );

    expect(mockDispatchWorkRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      NON_GENE_EXPRESSION_ETAG,
      expect.anything(),
    );
  });
});
