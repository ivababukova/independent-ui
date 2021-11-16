import React from 'react';
import _ from 'lodash';

import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import { Provider } from 'react-redux';

import fetchMock, { enableFetchMocks } from 'jest-fetch-mock';

// This should be imported before any components or action creators
// Because it contains mockings for connections to the backend
import '__test__/test-utils/mockWorkerBackend';

import fake from '__test__/test-utils/constants';
import markerGenesData5 from '__test__/data/marker_genes_5.json';
import markerGenesData2 from '__test__/data/marker_genes_2.json';
import expressionDataFAKEGENE from '__test__/data/gene_expression_FAKEGENE.json';

import mockAPI, {
  generateDefaultMockAPIResponses,
  statusResponse,
  workerResponse,
} from '__test__/test-utils/mockAPI';

import createTestComponentFactory from '__test__/test-utils/testComponentFactory';
import { makeStore } from 'redux/store';

import MarkerHeatmap from 'pages/experiments/[experimentId]/plots-and-tables/marker-heatmap/index';
import { loadBackendStatus } from 'redux/actions/backendStatus';
import { loadGeneExpression } from 'redux/actions/genes';

enableFetchMocks();

// Mock hash so we can control the ETag that is produced by hash.MD5 when fetching work requests
// EtagParams is the object that's passed to the function which generates ETag in fetchWork
jest.mock('object-hash', () => {
  const objectHash = jest.requireActual('object-hash');
  const mockWorkResultETag = jest.requireActual('__test__/test-utils/mockWorkResultETag').default;

  const mockWorkRequestETag = (ETagParams) => `${ETagParams.body.nGenes}-marker-genes`;
  const mockGeneExpressionETag = (ETagParams) => `${ETagParams.missingGenesBody.genes.join('-')}-expression`;

  return mockWorkResultETag(objectHash, mockWorkRequestETag, mockGeneExpressionETag);
});

// Worker responses are fetched from S3, so these endpoints are added to fetchMock
// the URL for the endpoints are generated by the functions passed to mockETag above
const mockWorkerResponses = {
  '5-marker-genes': () => workerResponse(markerGenesData5),
  '2-marker-genes': () => workerResponse(markerGenesData2),
  'FAKEGENE-expression': () => workerResponse(expressionDataFAKEGENE),
};

const experimentId = fake.EXPERIMENT_ID;
const plotUuid = 'markerHeatmapPlotMain';
let storeState = null;

const customAPIResponses = {
  [`/plots-tables/${plotUuid}`]: () => statusResponse(404, 'Not Found'),
};

const defaultResponses = _.merge(
  generateDefaultMockAPIResponses(experimentId),
  customAPIResponses,
  mockWorkerResponses,
);

const defaultProps = { experimentId };

const heatmapPageFactory = createTestComponentFactory(MarkerHeatmap, defaultProps);

// Helper function to get displayed genes from the gene input
const getDisplayedGenes = (container) => {
  const genesNodeList = container.querySelectorAll('span[class*=selection-item-content]');
  return Array.from(genesNodeList).map((gene) => gene.textContent);
};

describe('Marker heatmap plot', () => {
  beforeEach(async () => {
    fetchMock.resetMocks();
    fetchMock.mockIf(/.*/, mockAPI(defaultResponses));

    storeState = makeStore();

    // Set up state for backend status
    await storeState.dispatch(loadBackendStatus(experimentId));
  });

  it('Loads controls and elements', async () => {
    await act(async () => (
      render(
        <Provider store={storeState}>
          {heatmapPageFactory()}
        </Provider>,
      )
    ));

    expect(screen.getByText(/Marker heatmap/i)).toBeInTheDocument();

    expect(screen.getByText(/Gene selection/i)).toBeInTheDocument();
    expect(screen.getByText(/Select data/i)).toBeInTheDocument();
    expect(screen.getByText(/Cluster guardlines/i)).toBeInTheDocument();
    expect(screen.getByText(/Metadata tracks/i)).toBeInTheDocument();
    expect(screen.getByText(/Group by/i)).toBeInTheDocument();
    expect(screen.getByText(/Expression values/i)).toBeInTheDocument();
    expect(screen.getByText(/Main schema/i)).toBeInTheDocument();
    expect(screen.getByText(/Colours/i)).toBeInTheDocument();
    expect(screen.getByText(/Legend/i)).toBeInTheDocument();
  });

  it('Loads the plot', async () => {
    await act(async () => (
      render(
        <Provider store={storeState}>
          {heatmapPageFactory()}
        </Provider>,
      )
    ));

    expect(screen.getByRole('graphics-document', { name: 'Vega visualization' })).toBeInTheDocument();
  });

  it('Shows an error message if marker genes failed to load', async () => {
    const noDataResponse = {
      ...defaultResponses,
      '5-marker-genes': () => workerResponse('Not Found', 404),
    };

    fetchMock.mockIf(/.*/, mockAPI(noDataResponse));

    await act(async () => (
      render(
        <Provider store={storeState}>
          {heatmapPageFactory()}
        </Provider>,
      )
    ));

    // It shouldn't show the plot
    expect(screen.queryByRole('graphics-document', { name: 'Vega visualization' })).toBeNull();

    // There is an error message
    expect(screen.getByText(/Could not load marker genes/i)).toBeInTheDocument();
  });

  it('loads marker genes on specifying new nunmber of genes per cluster', async () => {
    await act(async () => (
      render(
        <Provider store={storeState}>
          {heatmapPageFactory()}
        </Provider>,
      )
    ));

    // Check that initially there are 5 marker genes - the default
    markerGenesData5.order.forEach((geneName) => {
      expect(screen.getByText(geneName)).toBeInTheDocument();
    });

    userEvent.click(screen.getByText('Marker genes'));

    expect(screen.getByText('Number of marker genes per cluster')).toBeInTheDocument();

    const nGenesInput = screen.getByRole('spinbutton', { name: 'Number of genes input' });

    userEvent.type(nGenesInput, '{backspace}2');

    await act(async () => {
      userEvent.click(screen.getByText('Run'));
    });

    // Go back to "Custom Genes" and check the number of genes
    userEvent.click(screen.getByText('Custom genes'));

    // The genes in Data 2 should exist
    markerGenesData2.order.forEach((geneName) => {
      expect(screen.getByText(geneName)).toBeInTheDocument();
    });
  });

  it('adds genes correctly into the plot', async () => {
    await act(async () => (
      render(
        <Provider store={storeState}>
          {heatmapPageFactory()}
        </Provider>,
      )
    ));

    // Add in a new gene
    // This is done because we can not insert text into the genes list input
    const genesToLoad = [...markerGenesData5.order, 'FAKEGENE'];

    await act(async () => {
      storeState.dispatch(loadGeneExpression(experimentId, genesToLoad, plotUuid));
    });

    expect(screen.getByText('FAKEGENE')).toBeInTheDocument();

    // The returned value is a HTML NodeList
    const genesContainer = screen.getByText('FAKEGENE').closest('div[class*=selector]');

    const displayedGenesList = getDisplayedGenes(genesContainer);

    // Check that the genes is ordered correctly.
    // This means that FAKEGENE should not be the last in the genes list
    expect(_.isEqual(displayedGenesList, genesToLoad)).toEqual(false);
  });

  it('Shows an error message if gene expression fails to load', async () => {
    const noDataResponse = {
      ...defaultResponses,
      'FAKEGENE-expression': () => workerResponse('Not Found', 404),
    };

    fetchMock.mockIf(/.*/, mockAPI(noDataResponse));

    await act(async () => (
      render(
        <Provider store={storeState}>
          {heatmapPageFactory()}
        </Provider>,
      )
    ));

    const genesToLoad = [...markerGenesData5.order, 'FAKEGENE'];

    await act(async () => {
      storeState.dispatch(loadGeneExpression(experimentId, genesToLoad, plotUuid));
    });

    // It shouldn't show the plot
    expect(screen.queryByRole('graphics-document', { name: 'Vega visualization' })).toBeNull();

    // There is an error message
    expect(screen.getByText(/Could not load gene expression data/i)).toBeInTheDocument();
  });

  it('removing a gene keeps the sorted order without re-sorting', async () => {
    await act(async () => (
      render(
        <Provider store={storeState}>
          {heatmapPageFactory()}
        </Provider>,
      )
    ));

    // Setting up so that there is an inserted gene in the list
    const genesToLoad = [...markerGenesData5.order, 'FAKEGENE'];

    await act(async () => {
      // This is done because we can not insert text into the genes list input
      storeState.dispatch(loadGeneExpression(experimentId, genesToLoad, plotUuid));
    });

    expect(screen.getByText('FAKEGENE')).toBeInTheDocument();

    // The returned value is a HTML NodeList
    const genesContainer = screen.getByText('FAKEGENE').closest('div[class*=selector]');
    const genesListBeforeRemoval = getDisplayedGenes(genesContainer);

    // Removing the 5th gene from the list
    // genesListBeforeRemoval is modified - splice removes the item from the list
    const geneToRemove = genesListBeforeRemoval.splice(5, 1);
    const geneRemoveButton = screen.getByText(geneToRemove).nextSibling;

    userEvent.click(geneRemoveButton);

    // Get newly displayed genes after the removal
    const genesListAfterRemoval = getDisplayedGenes(genesContainer);

    // The list of displayed genes should be in the same order as the displayed genes
    expect(_.isEqual(genesListAfterRemoval, genesListBeforeRemoval)).toEqual(true);
  });
});
