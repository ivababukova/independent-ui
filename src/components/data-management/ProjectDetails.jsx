/* eslint-disable react/jsx-props-no-spreading */
import React, { useState, useEffect, useRef } from 'react';
import {
  Typography, Space,
} from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import {
  MenuOutlined,
} from '@ant-design/icons';
import { sortableHandle } from 'react-sortable-hoc';
import PropTypes from 'prop-types';
import SpeciesSelector from './SpeciesSelector';
import MetadataEditor from './MetadataEditor';
import UploadDetailsModal from './UploadDetailsModal';
import SamplesTable from './SamplesTable';
import { UploadCell, EditableFieldCell, SampleNameCell } from './SamplesTableCells';
import MetadataColumn from './MetadataColumn';
import MetadataPopover from './MetadataPopover';
import {
  updateSample,
} from '../../redux/actions/samples';
import {
  deleteMetadataTrack,
  createMetadataTrack,
} from '../../redux/actions/projects';

import { DEFAULT_NA } from '../../redux/reducers/projects/initialState';

import validateInputs from '../../utils/validateInputs';
import { metadataNameToKey, metadataKeyToName, temporaryMetadataKey } from '../../utils/data-management/metadataUtils';
import '../../utils/css/data-management.css';
import ProjectMenu from './ProjectMenu';

const { Text } = Typography;

const ProjectDetails = ({ width, height }) => {
  const [uploadDetailsModalVisible, setUploadDetailsModalVisible] = useState(false);
  const uploadDetailsModalDataRef = useRef(null);

  const [isAddingMetadata, setIsAddingMetadata] = useState(false);
  const dispatch = useDispatch();
  const samples = useSelector((state) => state.samples);
  const { activeProjectUuid } = useSelector((state) => state.projects.meta) || false;
  const activeProject = useSelector((state) => state.projects[activeProjectUuid]) || false;

  const [tableColumns, setTableColumns] = useState([]);
  // const [sortedSpeciesData, setSortedSpeciesData] = useState([]);
  const [sampleNames, setSampleNames] = useState(new Set());

  const validationParams = {
    existingNames: sampleNames,
  };

  const MASS_EDIT_ACTIONS = [
    'REPLACE_EMPTY',
    'REPLACE_ALL',
    'CLEAR_ALL',
  ];

  useEffect(() => {
    if (activeProject && activeProject.samples.length > 0) {
      // if there are samples - build the table columns
      setSampleNames(new Set(activeProject.samples.map((id) => samples[id]?.name.trim())));
      const metadataColumns = activeProject?.metadataKeys.map(
        (metadataKey) => createInitializedMetadataColumn(metadataKeyToName(metadataKey)),
      ) || [];
      setTableColumns([...columns, ...metadataColumns]);
    } else {
      setTableColumns([]);
      setSampleNames(new Set());
    }
  }, [samples, activeProject]);

  const deleteMetadataColumn = (name) => {
    setTableColumns([...tableColumns.filter((entryName) => entryName !== name)]);
    dispatch(deleteMetadataTrack(name, activeProjectUuid));
  };

  const createMetadataColumn = () => {
    setIsAddingMetadata(true);

    const key = temporaryMetadataKey(tableColumns);
    const metadataColumn = {
      key,
      fixed: 'right',
      title: () => (
        <MetadataPopover
          existingMetadata={activeProject.metadataKeys}
          onCreate={(name) => {
            const newMetadataColumn = createInitializedMetadataColumn(name);

            setTableColumns([...tableColumns, newMetadataColumn]);
            dispatch(createMetadataTrack(name, activeProjectUuid));

            setIsAddingMetadata(false);
          }}
          onCancel={() => {
            deleteMetadataColumn(key);
            setIsAddingMetadata(false);
          }}
          message='Provide new metadata track name'
          visible
        >
          <Space>
            New Metadata Track
          </Space>
        </MetadataPopover>
      ),
      width: 200,
    };
    setTableColumns([...tableColumns, metadataColumn]);
  };

  const createUpdateObject = (value, metadataKey) => {
    const updateObject = metadataKey === 'species' ? { species: value } : { metadata: { [metadataKey]: value } };
    return updateObject;
  };

  const setCells = (value, metadataKey, actionType) => {
    if (!MASS_EDIT_ACTIONS.includes(actionType)) return;
    const updateObject = createUpdateObject(value, metadataKey);

    const canUpdateCell = (sampleUuid, action) => {
      if (action !== 'REPLACE_EMPTY') return true;

      const isSpeciesEmpty = (uuid) => metadataKey === 'species' && !samples[uuid].species;
      const isMetadataEmpty = (uuid) => metadataKey !== 'species'
        && (!samples[uuid].metadata[metadataKey]
          || samples[uuid].metadata[metadataKey] === DEFAULT_NA);

      return isMetadataEmpty(sampleUuid) || isSpeciesEmpty(sampleUuid);
    };

    activeProject.samples.forEach(
      (sampleUuid) => {
        if (canUpdateCell(sampleUuid, actionType)) {
          dispatch(updateSample(sampleUuid, updateObject));
        }
      },
    );
  };

  const createInitializedMetadataColumn = (name) => {
    const key = metadataNameToKey(name);

    const newMetadataColumn = {
      key,
      title: () => (
        <MetadataColumn
          name={name}
          validateInput={
            (newName, metadataNameValidation) => validateInputs(
              newName, metadataNameValidation, validationParams,
            ).isValid
          }
          setCells={setCells}
          deleteMetadataColumn={deleteMetadataColumn}
          key={key}
          activeProjectUuid={activeProjectUuid}
        />
      ),
      width: 200,
      dataIndex: key,
      render: (cellValue, record, rowIdx) => (
        <EditableFieldCell
          initialText={DEFAULT_NA}
          cellText={cellValue}
          dataIndex={key}
          rowIdx={rowIdx}
          onAfterSubmit={(newValue) => {
            dispatch(updateSample(record.uuid, { metadata: { [key]: newValue } }));
          }}
        />
      ),
    };
    return newMetadataColumn;
  };

  // const DragHandle = sortableHandle(() => <MenuOutlined style={{ cursor: 'grab', color: '#999' }} />);

  // const renderUploadCell = (columnId, tableCellData) => {
  //   const {
  //     sampleUuid,
  //     file,
  //   } = tableCellData;
  //   const showDetails = () => {
  //     uploadDetailsModalDataRef.current = {
  //       sampleUuid,
  //       fileCategory: columnId,
  //       file,
  //     };
  //     setUploadDetailsModalVisible(true);
  //   };
  //   return (
  //     <UploadCell file={file} showDetails={() => showDetails('barcodes', tableCellData)} />
  //   );
  // };

  const columns = [
    // {
    //   index: 0,
    //   key: 'sort',
    //   dataIndex: 'sort',
    //   width: 30,
    //   render: () => <DragHandle />,
    // },
    // {
    //   className: 'data-test-class-sample-cell',
    //   index: 1,
    //   key: 'sample',
    //   title: 'Sample',
    //   dataIndex: 'name',
    //   fixed: true,
    //   render: (text, record, indx) => <SampleNameCell cellInfo={{ text, record, indx }} />,
    // },
    // {
    //   index: 2,
    //   key: 'barcodes',
    //   title: 'barcodes.tsv',
    //   dataIndex: 'barcodes',
    //   render: (tableCellData) => renderUploadCell('barcodes', tableCellData),
    // },
    // {
    //   index: 3,
    //   key: 'genes',
    //   title: 'genes.tsv',
    //   dataIndex: 'genes',
    //   render: (tableCellData) => renderUploadCell('genes', tableCellData),
    // },
    // {
    //   index: 4,
    //   key: 'matrix',
    //   title: 'matrix.mtx',
    //   dataIndex: 'matrix',
    //   render: (tableCellData) => renderUploadCell('matrix', tableCellData),
    // },
    {
      index: 5,
      key: 'species',
      title: () => (
        <Space>
          <Text>Species</Text>
          <MetadataEditor
            onReplaceEmpty={(value) => setCells(value, 'species', 'REPLACE_EMPTY')}
            onReplaceAll={(value) => setCells(value, 'species', 'REPLACE_ALL')}
            onClearAll={() => setCells(null, 'species', 'CLEAR_ALL')}
            massEdit
          >
            <SpeciesSelector />
          </MetadataEditor>
        </Space>
      ),
      dataIndex: 'species',
      render: (organismId, record) => (
        <SpeciesSelector
          value={organismId}
          onChange={(value) => {
            dispatch(updateSample(record.uuid, { species: value }));
          }}
        />
      ),
      width: 200,
    },
  ];

  return (
    <>
      <UploadDetailsModal
        sampleName={samples[uploadDetailsModalDataRef.current?.sampleUuid]?.name}
        uploadDetailsModalDataRef={uploadDetailsModalDataRef}
        visible={uploadDetailsModalVisible}
        onCancel={() => setUploadDetailsModalVisible(false)}
      />
      <div id='project-details' width={width} height={height}>
        <Space direction='vertical' style={{ width: '100%', padding: '8px 4px' }}>
          <ProjectMenu
            createMetadataColumn={() => createMetadataColumn()}
            isAddingMetadata={isAddingMetadata}
          />
          <SamplesTable
            height={height}
            tableColumns={tableColumns}
          />
        </Space>
      </div>
    </>
  );
};

ProjectDetails.propTypes = {
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
};

export default ProjectDetails;
