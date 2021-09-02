/* eslint-disable import/no-unresolved */
/* eslint-disable react/jsx-props-no-spreading */
import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import PropTypes from 'prop-types';
import {
  Table, Row, Col, Typography, Space, Button,
} from 'antd';
import {
  MenuOutlined,
} from '@ant-design/icons';
import { sortableHandle, sortableContainer, sortableElement } from 'react-sortable-hoc';

import { DEFAULT_NA } from 'redux/reducers/projects/initialState';
import { updateExperiment } from 'redux/actions/experiments';
import { updateProject } from 'redux/actions/projects';
import { Storage } from 'aws-amplify';
import UploadStatus from 'utils/upload/UploadStatus';
import { arrayMoveImmutable } from 'utils/array-move';
import downloadFromUrl from 'utils/data-management/downloadFromUrl';
import {
  updateSample,
} from '../../redux/actions/samples';
import {
  deleteMetadataTrack,
  createMetadataTrack,
} from '../../redux/actions/projects';
import { UploadCell, SampleNameCell, EditableFieldCell } from './SamplesTableCells';
import MetadataEditor from './MetadataEditor';
import SpeciesSelector from './SpeciesSelector';
import UploadDetailsModal from './UploadDetailsModal';
import MetadataPopover from './MetadataPopover';

import MetadataColumn from './MetadataColumn';
import { metadataNameToKey, metadataKeyToName, temporaryMetadataKey } from '../../utils/data-management/metadataUtils';
import validateInputs from '../../utils/validateInputs';

const { Paragraph, Text } = Typography;

const SamplesTable = (props) => {
  const { height } = props;
  const dispatch = useDispatch();
  const [tableData, setTableData] = useState([]);
  const [uploadDetailsModalVisible, setUploadDetailsModalVisible] = useState(false);

  const projects = useSelector((state) => state.projects);
  const samples = useSelector((state) => state.samples);
  const { activeProjectUuid } = useSelector((state) => state.projects.meta) || false;
  const activeProject = useSelector((state) => state.projects[activeProjectUuid]) || false;
  const environment = useSelector((state) => state?.networkResources?.environment);
  const uploadDetailsModalDataRef = useRef(null);

  const [sampleNames, setSampleNames] = useState(new Set());
  const [isAddingMetadata, setIsAddingMetadata] = useState(false);

  const anyProjectsAvailable = projects?.ids?.length;

  const initialTableColumns = [
    {
      index: 0,
      key: 'sort',
      dataIndex: 'sort',
      width: 30,
      render: () => <DragHandle />,
    },
    {
      className: 'data-test-class-sample-cell',
      index: 1,
      key: 'sample',
      title: 'Sample',
      dataIndex: 'name',
      fixed: true,
      render: (text, record, indx) => <SampleNameCell cellInfo={{ text, record, indx }} />,
    },
    {
      index: 2,
      key: 'barcodes',
      title: 'barcodes.tsv',
      dataIndex: 'barcodes',
      render: (tableCellData) => renderUploadCell('barcodes', tableCellData),
    },
    {
      index: 3,
      key: 'genes',
      title: 'genes.tsv',
      dataIndex: 'genes',
      render: (tableCellData) => renderUploadCell('genes', tableCellData),
    },
    {
      index: 4,
      key: 'matrix',
      title: 'matrix.mtx',
      dataIndex: 'matrix',
      render: (tableCellData) => renderUploadCell('matrix', tableCellData),
    },
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

  const [tableColumns, setTableColumns] = useState(initialTableColumns);

  const validationParams = {
    existingNames: sampleNames,
  };

  useEffect(() => {
    if (activeProject && activeProject.samples.length > 0) {
      // if there are samples - build the table columns
      setSampleNames(new Set(activeProject.samples.map((id) => samples[id]?.name.trim())));
      const metadataColumns = activeProject?.metadataKeys.map(
        (metadataKey) => createInitializedMetadataColumn(metadataKeyToName(metadataKey)),
      ) || [];
      setTableColumns([...initialTableColumns, ...metadataColumns]);
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

  const DragHandle = sortableHandle(() => <MenuOutlined style={{ cursor: 'grab', color: '#999' }} />);

  const renderUploadCell = (columnId, tableCellData) => {
    const {
      sampleUuid,
      file,
    } = tableCellData;
    const showDetails = () => {
      uploadDetailsModalDataRef.current = {
        sampleUuid,
        fileCategory: columnId,
        file,
      };
      setUploadDetailsModalVisible(true);
    };
    return (
      <UploadCell file={file} showDetails={() => showDetails('barcodes', tableCellData)} />
    );
  };

  const MASS_EDIT_ACTIONS = [
    'REPLACE_EMPTY',
    'REPLACE_ALL',
    'CLEAR_ALL',
  ];

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

  useEffect(() => {
    if (!activeProject || !samples[activeProject.samples[0]]) {
      setTableData([]);
      return;
    }

    // Set table data

    const newData = activeProject.samples.map((sampleUuid, idx) => {
      const sampleFiles = samples[sampleUuid].files;

      const barcodesFile = sampleFiles['barcodes.tsv.gz'] ?? { upload: { status: UploadStatus.FILE_NOT_FOUND } };
      const genesFile = sampleFiles['features.tsv.gz'] ?? { upload: { status: UploadStatus.FILE_NOT_FOUND } };
      const matrixFile = sampleFiles['matrix.mtx.gz'] ?? { upload: { status: UploadStatus.FILE_NOT_FOUND } };

      const barcodesData = { sampleUuid, file: barcodesFile };
      const genesData = { sampleUuid, file: genesFile };
      const matrixData = { sampleUuid, file: matrixFile };

      return {
        key: idx,
        name: samples[sampleUuid].name,
        uuid: sampleUuid,
        barcodes: barcodesData,
        genes: genesData,
        matrix: matrixData,
        species: samples[sampleUuid].species || DEFAULT_NA,
        ...samples[sampleUuid].metadata,
      };
    });
    setTableData(newData);
  }, [projects, samples, activeProjectUuid]);

  const onSortEnd = ({ oldIndex, newIndex }) => {
    if (oldIndex !== newIndex) {
      // This can be done because there is only one experiment per project
      // Has to be changed when we support multiple experiments per project
      const experimentId = activeProject.experiments[0];

      const newData = arrayMoveImmutable(tableData, oldIndex, newIndex).filter((el) => !!el);
      const newSampleOrder = newData.map((sample) => sample.uuid);

      dispatch(updateProject(activeProjectUuid, { samples: newSampleOrder }));
      dispatch(updateExperiment(experimentId, { sampleIds: newSampleOrder }));
      setTableData(newData);
    }
  };

  const SortableRow = sortableElement((otherProps) => <tr {...otherProps} className={`${otherProps.className} drag-visible`} />);
  const SortableTable = sortableContainer((otherProps) => <tbody {...otherProps} />);

  const DragContainer = (otherProps) => (
    <SortableTable
      useDragHandle
      disableAutoscroll
      helperClass='row-dragging'
      onSortEnd={onSortEnd}
      {...otherProps}
    />
  );

  const DraggableRow = (otherProps) => {
    const index = tableData.findIndex((x) => x.key === otherProps['data-row-key']);
    return <SortableRow index={index} {...otherProps} />;
  };
  const downloadPublicDataset = async () => {
    const s3Object = await Storage.get('PBMC_3k.zip',
      {
        bucket: `biomage-public-datasets-${environment}`,
        contentType: 'multipart/form-data',
      });
    downloadFromUrl(s3Object);
  };

  const noDataText = (
    <Paragraph>
      Start uploading your samples using the “Add samples” button.
      <br />
      Don&apos;t have data? Download an example PBMC dataset
      {' '}
      <a onClick={() => downloadPublicDataset()}>here</a>
      .
    </Paragraph>
  );
  return (
    <>
      <UploadDetailsModal
        sampleName={samples[uploadDetailsModalDataRef.current?.sampleUuid]?.name}
        uploadDetailsModalDataRef={uploadDetailsModalDataRef}
        visible={uploadDetailsModalVisible}
        onCancel={() => setUploadDetailsModalVisible(false)}
      />
      <Button
        disabled={
          !anyProjectsAvailable
          || activeProject?.samples?.length === 0
          || isAddingMetadata
        }
        onClick={() => {
          createMetadataColumn();
        }}
      >
        Add metadata
      </Button>
      <Row>
        <Col>
          <Table
            size='small'
            scroll={{
              x: 'max-content',
              y: height - 250,
            }}
            bordered
            columns={tableColumns}
            dataSource={tableData}
            sticky
            pagination={false}
            locale={{ emptyText: noDataText }}
            components={{
              body: {
                wrapper: DragContainer,
                row: DraggableRow,
              },
            }}
          />
        </Col>
      </Row>
    </>
  );
};

SamplesTable.propTypes = {
  height: PropTypes.number.isRequired,
  // tableColumns: PropTypes.array.isRequired,
};

export default React.memo(SamplesTable);
