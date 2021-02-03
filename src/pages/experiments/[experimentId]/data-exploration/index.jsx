import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { Tabs } from 'antd';
import { Mosaic, MosaicWindow, RemoveButton } from 'react-mosaic-component';
import ReactResizeDetector from 'react-resize-detector';
import Error from '../../../_error';
import Header from './components/header';
import CellSetsTool from './components/cell-sets-tool/CellSetsTool';
import GeneListTool from './components/gene-list-tool/GeneListTool';
import DiffExprManager from './components/differential-expression-tool/DiffExprManager';
import Embedding from './components/embedding/Embedding';
import { COMPONENT_TYPE, HeatmapPlot } from './components/heatmap/HeatmapPlot';
import HeatmapSettings from './components/heatmap/HeatmapSettings';
import { updateLayout } from '../../../../redux/actions/layout';
import getApiEndpoint from '../../../../utils/apiEndpoint';
import { getFromApiExpectOK } from '../../../../utils/cacheRequest';
import PreloadContent from '../../../../components/PreloadContent';

import 'react-mosaic-component/react-mosaic-component.css';
import '@blueprintjs/core/lib/css/blueprint.css';

const { TabPane } = Tabs;

const renderWindow = (tile, width, height) => {
  if (tile) {
    return (
      <div style={{ padding: '10px' }}>
        {height && width ? tile(width, height) : <></>}
      </div>
    );
  }
  return <></>;
};

const ExplorationViewPage = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const { experimentId } = router.query;
  const layout = useSelector((state) => state.layout);
  const { windows, panel } = layout;
  const [selectedTab, setSelectedTab] = useState(panel);

  useEffect(() => {
    setSelectedTab(panel);
  }, [panel]);

  const { data, error } = useSWR(`${getApiEndpoint()}/v1/experiments/${experimentId}`, getFromApiExpectOK);

  const TILE_MAP = {
    'UMAP Embedding': {
      toolbarControls: [<RemoveButton />],
      component: (width, height) => <Embedding experimentId={experimentId} embeddingType='umap' width={width} height={height} />,
    },
    Heatmap: {
      toolbarControls: [
        <HeatmapSettings componentType={COMPONENT_TYPE} />,
        <RemoveButton />,
      ],
      component: (width, height) => (
        <HeatmapPlot experimentId={experimentId} width={width} height={height} />
      ),
    },
    Tools: {
      toolbarControls: [<RemoveButton />],
      component: (width, height) => (
        <Tabs
          size='small'
          activeKey={selectedTab}
          onChange={(key) => { setSelectedTab(key); }}
        >
          <TabPane tab='Gene list' key='Gene list'>
            <GeneListTool experimentId={experimentId} width={width} height={height} />
          </TabPane>
          <TabPane tab='Differential expression' key='Differential expression'>
            <DiffExprManager experimentId={experimentId} view='compute' width={width} height={height} />
          </TabPane>
        </Tabs>
      ),
    },
    'Data Management': {
      toolbarControls: [<RemoveButton />],
      component: (width, height) => <CellSetsTool experimentId={experimentId} width={width} height={height} />,
    },
  };

  if (error) {
    if (error.payload === undefined) {
      return <Error errorText='Cannot connect to API service.' />;
    }
    const { status } = error.payload;
    return <Error errorText={status} />;
  }

  if (!data) {
    return <PreloadContent />;
  }

  return (
    <>
      <Header experimentId={experimentId} />
      <div style={{ height: '100%', width: '100%', margin: 0 }}>
        <Mosaic
          renderTile={(id, path) => (
            <ReactResizeDetector
              handleWidth
              handleHeight
              refreshMode='throttle'
              refreshRate={500}
            >
              {({ width, height }) => (
                <MosaicWindow
                  path={path}
                  title={id}
                  toolbarControls={TILE_MAP[id].toolbarControls}
                >
                  {renderWindow(TILE_MAP[id].component, width, height)}
                </MosaicWindow>
              )}
            </ReactResizeDetector>
          )}
          onRelease={(changedLayout) => {
            dispatch(updateLayout(changedLayout));
          }}
          initialValue={windows}
        />
      </div>
    </>
  );
};

export default ExplorationViewPage;
