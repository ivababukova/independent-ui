import {
  DIFF_EXPR_LOADING, DIFF_EXPR_LOADED, DIFF_EXPR_ERROR,
} from '../../actionTypes/differentialExpression';

import sendWork from '../../../utils/sendWork';

const getCellSetName = (name) => (name?.split('/')[1] || name);

const REQUEST_TIMEOUT = 60;
const loadDifferentialExpression = (
  experimentId, cellSets, comparisonType, tableState,
) => async (dispatch) => {
  dispatch({
    type: DIFF_EXPR_LOADING,
    payload: {
      experimentId,
    },
  });

  const body = {
    name: 'DifferentialExpression',
    experimentId,
    cellSet: getCellSetName(cellSets.cellSet),
    compareWith: getCellSetName(cellSets.compareWith),
    basis: getCellSetName(cellSets.basis),
  };

  let pagination = {};

  if (tableState) {
    const currentPageSize = tableState.pagination.pageSize;

    pagination = {
      orderBy: tableState.sorter.field,
      orderDirection: (tableState.sorter.order === 'ascend') ? 'ASC' : 'DESC',
      offset: ((tableState.pagination.current - 1) * currentPageSize),
      limit: currentPageSize,
      responseKey: 0,
    };

    if (tableState.geneNamesFilter) {
      pagination.filters = [{
        columnName: 'gene_names',
        type: 'text',
        expression: tableState.geneNamesFilter,
      }];
    }

    pagination = { pagination };
  }

  try {
    const response = await sendWork(
      experimentId, REQUEST_TIMEOUT, body, pagination,
    );
    const data = JSON.parse(response.results[0].body);
    let { total } = data;
    const { rows } = data;

    if (!total && !Object.keys(pagination).length) {
      total = rows.length;
    }
    return dispatch({
      type: DIFF_EXPR_LOADED,
      payload: {
        experimentId,
        data: rows,
        cellSets,
        total,
        comparisonType,
      },
    });
  } catch (error) {
    dispatch({
      type: DIFF_EXPR_ERROR,
      payload: {
        experimentId,
        error: "Couldn't fetch differential expression results data.",
      },
    });
  }
};

export default loadDifferentialExpression;