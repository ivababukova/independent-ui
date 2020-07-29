import React from 'react';
import {
  PageHeader, Collapse, Switch, Tooltip,
} from 'antd';
import CellSizeDistribution from './components/CellSizeDistribution/CellSizeDistribution';

const { Panel } = Collapse;

class ProcessingViewPage extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      filtering1: false,
    };
  }

  render() {
    const { filtering1 } = this.state;
    const disableFiltering = () => {
      this.setState({ filtering1: !filtering1 });
    };
    return (
      <>
        <PageHeader
          className='site-page-header'
          title='Data Processing'
          subTitle='Powerful data exploration'
          style={{ width: '100%', paddingRight: '0px' }}
        />

        <Collapse accordion>
          <Panel
            header='Cell size Distribution'
            extra={(
              <Tooltip placement='topLeft' title='disable filter'>
                <Switch defaultChecked onChange={disableFiltering} />
              </Tooltip>
            )}
            key='1'
          >
            <CellSizeDistribution filtering={filtering1} />
          </Panel>
          <Panel header='Mitochondrial content' key='2' />
          <Panel header='Read alignment' key='3' />
          <Panel header='Classifier' key='4' />
          <Panel header='Number of genes vs number of UMIs' key='5' />
          <Panel header='Doublet scores' key='6' />
        </Collapse>
      </>
    );
  }
}

export default ProcessingViewPage;