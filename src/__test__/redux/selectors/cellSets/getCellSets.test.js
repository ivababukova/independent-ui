/* eslint-disable import/no-unresolved */
import initialCellSetsState from 'redux/reducers/cellSets/initialState';
import mockCellSets from 'utils/tests/mockStores/cellSets';
import getCellSets from 'redux/selectors/cellSets/getCellSets';

describe('Get cell sets selector test', () => {
  it('should return store cellsets if available', () => {
    expect(getCellSets()(mockCellSets())).toEqual(mockCellSets());
  });
  it('should return default cell sets if unavailable', () => {
    expect(getCellSets()({})).toEqual(initialCellSetsState);
  });
});