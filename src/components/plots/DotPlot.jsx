import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { Vega } from 'react-vega';
import _ from 'lodash';
import { generateSpec } from 'utils/plotSpecs/generateDotPlotSpec';
import { getCellSets } from 'redux/selectors';

import PlatformError from 'components/PlatformError';
import { fastLoad } from 'components/Loader';

// Mock data, delete this once we have the real data
const generateMockData = (numGenes, numClusters) => {
  const mockPlotData = [];

  for (let gene = 0; gene < numGenes; gene += 1) {
    for (let cluster = 0; cluster < numClusters; cluster += 1) {
      mockPlotData.push({
        gene: `gene${gene}`,
        cluster: `cluster${cluster}`,
        AvgExpression: Math.random(),
        cellsFraction: Math.random(),
      });
    }
  }

  return mockPlotData;
};

const plotData = generateMockData(3, 14);

const DotPlot = (props) => {
  const { config } = props;

  const [numClusters, setNumClusters] = useState(0);

  const { loading, error, hierarchy } = useSelector(getCellSets());

  useEffect(() => {
    if (Object.keys(hierarchy).length === 0) return;

    const clusters = _.find(
      hierarchy,
      (rootNode) => rootNode.key === config.selectedRootNode,
    ).children.length;

    setNumClusters(clusters);
  }, [hierarchy]);

  const actions = {
    export: true,
    source: false,
    compiled: false,
    editor: true,
  };

  const render = () => {
    if (error) {
      return (
        <PlatformError
          error={error}
          onClick={() => {
            // This needs to be implemented when implementing the backend
            // reloadPlotData();
          }}
        />
      );
    }

    if (loading || numClusters === 0) {
      return (
        <center>
          {fastLoad()}
        </center>
      );
    }

    return <Vega spec={generateSpec(config, plotData, numClusters)} renderer='canvas' actions={actions} />;
  };

  return render();
};

DotPlot.propTypes = {
  config: PropTypes.object.isRequired,
};

export default DotPlot;
