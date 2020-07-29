import React, { useState, useEffect } from 'react';
import {
  useSelector, useDispatch,
} from 'react-redux';

import {
  Button, Form, Select, Typography, Tooltip,
} from 'antd';

import PropTypes from 'prop-types';
import _ from 'lodash';
import { loadCellSets } from '../../../../redux/actions/cellSets';


const { Text } = Typography;

const { Option, OptGroup } = Select;

const ComparisonTypes = {
  One: 'Versus rest',
  Two: 'Across sets',
};

const DiffExprCompute = (props) => {
  const {
    experimentId, onCompute, selection, comparison,
  } = props;

  const dispatch = useDispatch();

  const properties = useSelector((state) => state.cellSets.properties);
  const hierarchy = useSelector((state) => state.cellSets.hierarchy);
  const [selectableClusters, setSelectableClusters] = useState(_.cloneDeep(hierarchy));

  const [isFormValid, setIsFormValid] = useState(false);
  const [comparisonType, setComparisonType] = useState(comparison);

  const defaultSelected = 'Select a cell set';
  const [selectedCellSets, setSelectedCellSets] = useState(selection);

  /**
   * Loads cell set on initial render if it does not already exist in the store.
   */
  useEffect(() => {
    dispatch(loadCellSets(experimentId));
  }, []);

  /**
   * Re-renders the list of selections when the hierarchy or the properties change.
   *
   * If the cell set previously selected is deleted, the selection is reset to the default.
   */
  useEffect(() => {
    setSelectableClusters(hierarchy);

    setSelectedCellSets(_.mapValues(selectedCellSets, (cellSetKey) => {
      if (cellSetKey !== defaultSelected && !properties[cellSetKey]) {
        return defaultSelected;
      }

      return cellSetKey;
    }));
  }, [hierarchy, properties]);


  const validateForm = () => {
    if (selectedCellSets.second === 'All') {
      setComparisonType(ComparisonTypes.One);
    } else {
      setComparisonType(ComparisonTypes.Two);
    }

    if (selectedCellSets.first === defaultSelected) {
      setIsFormValid(false);
      return;
    }

    if (selectedCellSets.second === defaultSelected) {
      setIsFormValid(false);
      return;
    }

    if (selectedCellSets.first === selectedCellSets.second) {
      setIsFormValid(false);
      return;
    }

    if (comparisonType === ComparisonTypes.Two && selectedCellSets.second === defaultSelected) {
      setIsFormValid(false);
      return;
    }

    setIsFormValid(true);
  };

  useEffect(() => {
    validateForm();
  }, [selectedCellSets]);

  /**
   * Updates the selected clusters.
   * @param {string} cellSet The key of the cell set.
   * @param {string} option The option string (`first` or `second`).
   */
  const onSelectCluster = (cellSet, option) => {
    setSelectedCellSets({
      ...selectedCellSets,
      [option]: cellSet,
    });
  };

  /**
   * Constructs a form item, a `Select` field with selectable clusters.
   */
  const renderClusterSelectorItem = (title, option) => {
    const renderChildren = (children) => {
      if (!children || children.length === 0) { return (<></>); }

      return children.map(({ key }) => (
        <Option key={key} disabled={Object.values(selectedCellSets).includes(key)}>
          {properties[key]?.name}
        </Option>
      ));
    };

    return (
      <Form.Item label={title}>
        <Select
          style={{ width: 200 }}
          onChange={(cellSet) => onSelectCluster(cellSet, option)}
          value={selectedCellSets[option]}
          size='small'
        >
          {
            selectableClusters && selectableClusters.map(({ key, children }) => (
              <OptGroup label={properties[key]?.name} key={key}>
                {option === 'second' ? (
                  <Option key='All' disabled={Object.values(selectedCellSets).includes('All')}>
                    <Tooltip placement='left' title='Compare above selected set and its complements'>
                      <span style={{ display: 'flex', flexGrow: 1 }}>All</span>
                    </Tooltip>
                  </Option>
                ) : <></>}
                {renderChildren(children)}
              </OptGroup>
            ))
          }
        </Select>
      </Form.Item>
    );
  };

  return (
    <Form size='small' layout='vertical'>
      {renderClusterSelectorItem('Compare:', 'first')}
      {renderClusterSelectorItem('Versus:', 'second')}

      <p>
        <Text type='secondary'>
          Performs a Wilcoxon rank-sum test between selected sets. Cite
          {' '}
          <a href='https://diffxpy.readthedocs.io/en/latest/api/diffxpy.api.test.pairwise.html'>
            diffxpy.api.test.pairwise
          </a>
          {' '}
          as appropriate.
        </Text>
      </p>

      <Form.Item>
        <Button
          size='small'
          disabled={!isFormValid}
          onClick={() => onCompute(
            comparisonType,
            selectedCellSets,
          )}
        >
          Compute
        </Button>
      </Form.Item>
    </Form>
  );
};

DiffExprCompute.defaultProps = {
  comparison: null,
};

DiffExprCompute.propTypes = {
  experimentId: PropTypes.string.isRequired,
  onCompute: PropTypes.func.isRequired,
  selection: PropTypes.object.isRequired,
  comparison: PropTypes.string,
};

export default DiffExprCompute;