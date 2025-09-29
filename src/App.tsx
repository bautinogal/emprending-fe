import { useState, useEffect, type SyntheticEvent } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import './App.css'

import * as React from 'react';
import { Box, Button, Divider, Drawer, TextField, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Tab, Tabs, Typography, Modal, LinearProgress } from '@mui/material';
import { ChevronLeft as ChevronLeftIcon, Download as DownloadIcon, Groups as GroupsIcon, Menu as MenuIcon, School as SchoolIcon, UploadFile as UploadFileIcon } from '@mui/icons-material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { RootState, AppDispatch } from './store/store';
import { setParameters, setFile, optimizeGroups } from './store/appSlice';

interface Warnings {
  others: string[];
  unassignedAlumnos: string[];
  tutoresNotFound: { alumno: string; tutor: string, closest: string, score: number }[];
}

interface OptimizationParameters {
  // Genetic algorithm parameters, n should be at least 20-30, ideally 2-5x the chromosome length
  // Keep n x iterations < 1M
  seed: number;
  geneticIterations: number; // 5 - 100
  populationSize: number; // < 2^n
  mutationRate: number; // 0.05-0.2 typical (10% chance)
  crossoverRate: number; // 0.6-0.9 typical (70% chance)
  tournamentSize: number; // < n / 2 //  2-3 for exploration, 4-5 for exploitation
  elitismCount: number; // 0 - 1 // 2-5% of population size

  // Assignment parameters
  minCantidadGrupos: number;
  maxCantidadGrupos: number;
  minAlumnosPorGrupo: number;
  maxAlumnosPorGrupo: number;
  minTutoresPorGrupo: number;
  maxTutoresPorGrupo: number;
  similarityThreshold: number;
  pesoRelativoTutores: number[];
}

interface Tutor { nombre: string, apellido: string, email: string, id: number }

interface Alumno { nombre: string, apellido: string, email: string, value: number, tutores: Tutor[], id: number }

interface Grupo { tutores: Tutor[], alumnos: Alumno[] };


interface Individual {
  parentA: string | null;
  parentB: string | null;
  generation: number;
  extintGeneration: number | null;
  alumnosIds: number[];
  grupos: Grupo[];
  fitness: number;
};

interface Generation {
  i: number;
  inititialTime: number;
  endTime: number | null;

  individuals: string[];
  tournments: {
    groupA: string[];
    groupB: string[];
    result: {
      parentA: string;
      parentB: string;
      offspring: string;
      crossover: boolean;
    }
  }[];

  shuffleRepeats: number;

  // Fitness statistics
  bestFitness: number;
  worstFitness: number;
  averageFitness: number;
};
interface History {
  inititialTime: number;
  endTime: number | null;

  champion: Individual;
  worst: Individual;
  individuals: { [key: string]: Individual };
  populationZero: string[];
  generations: Generation[];
};

interface Result {
  warnings: Warnings;
  history: History;
  parameters: OptimizationParameters
}


const CustomTabPanel = (props: { children?: React.ReactNode; index: string; value: string; }) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      style={{ height: '100%', display: value === index ? 'flex' : 'none', flexDirection: 'column' }}
      {...other}
    >
      {value === index && children}
    </div>
  );
};

const OptimizationProgressModal = () => {
  const running = useSelector((state: RootState) => state.app.running);
  const runningPercentage = useSelector((state: RootState) => state.app.runningPercentage);
  const generation = useSelector((state: RootState) => state.app?.generation);
  const totalIterations = useSelector((state: RootState) => state.app.totalIterations);
  const currentBestScore = useSelector((state: RootState) => state.app.currentBestScore);
  const currentWorstScore = useSelector((state: RootState) => state.app.currentWorstScore);
  const perfectFitness = useSelector((state: RootState) => state.app.perfectFitness);
  const maxTeoricalFitness = useSelector((state: RootState) => state.app.maxTeoricalFitness);
  const combinations = useSelector((state: RootState) => state.app.combinations);
  
  return (
    <Modal open={running} disableEscapeKeyDown sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', }} >
      <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 24, p: 4, minWidth: 400, maxWidth: 600 }}>
        <Typography variant="h5" sx={{ mb: 3, textAlign: 'center', fontWeight: 600 }}>
          🧬 Optimización en Progreso
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">Progreso General</Typography>
            <Typography variant="body2" color="primary.main" fontWeight={600}>
              {Math.round((runningPercentage || 0) * 100)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={(runningPercentage || 0) * 100}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        {generation && (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 3 }}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="h4" color="primary.main" fontWeight={600}>
                {generation?.i || 0} / {totalIterations || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Generación
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="h4" color="info.main" fontWeight={600}>
                {combinations || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total Combinaciones
              </Typography>
            </Box>
          </Box>
        )}

        {currentBestScore !== null && perfectFitness !== null && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" sx={{ mb: 1, fontWeight: 600 }}>
              Fitness Histórico
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, textAlign: 'center' }}>
              <Box>
                <Typography variant="h6" color="success.main" fontWeight={600}>
                  {currentBestScore.toFixed(2)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Mejor Histórico
                </Typography>
              </Box>
              <Box>
                <Typography variant="h6" color="error.main" fontWeight={600}>
                  {(currentWorstScore || 0).toFixed(2)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Peor Histórico
                </Typography>
              </Box>
              <Box>
                <Typography variant="h6" color="info.main" fontWeight={600}>
                  {maxTeoricalFitness ? maxTeoricalFitness.toFixed(2) : 'N/A'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Máximo Teórico
                </Typography>
              </Box>
            </Box>

            {perfectFitness > 0 && (
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Eficiencia</Typography>
                  <Typography variant="body2" color="success.main" fontWeight={600}>
                    {((currentBestScore / perfectFitness) * 100).toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(currentBestScore / perfectFitness) * 100}
                  sx={{ height: 6, borderRadius: 3 }}
                  color="success"
                />
              </Box>
            )}
          </Box>
        )}

        {generation?.individuals && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" sx={{ mb: 1, fontWeight: 600 }}>
              Generación Actual
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, textAlign: 'center' }}>
              <Box>
                <Typography variant="body2" color="success.main" fontWeight={600}>
                  {generation.bestFitness?.toFixed(2) || 'N/A'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Mejor
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="warning.main" fontWeight={600}>
                  {generation.averageFitness?.toFixed(2) || 'N/A'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Promedio
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="error.main" fontWeight={600}>
                  {generation.worstFitness?.toFixed(2) || 'N/A'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Peor
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
          El algoritmo genético está buscando la mejor combinación de grupos...
        </Typography>
      </Box>
    </Modal>
  );
};

const Tutorias = () => {
  const handleTutoriasTabChange = (_event: SyntheticEvent, newValue: number) => {
    setTutoriasTab(newValue);
  };
  const [tutoriasTab, setTutoriasTab] = useState(0);
  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Tabs value={tutoriasTab} onChange={handleTutoriasTabChange}>
        <Tab label="Tab 1" value={0} />
        <Tab label="Tab 2" value={1} />
      </Tabs>
    </Box>
  );
};

const Maraton = () => {
  const dispatch = useDispatch<AppDispatch>();
  const tabs = ['Tutores', 'Alumnos', 'Parámetros', 'Resultados'];
  const [maratonTab, setMaratonTab] = useState('Tutores');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'alumnos' | 'tutores') => {
    const parseCSV = (text: string, type: 'alumnos' | 'tutores'): { data: any[], columns: GridColDef[], error?: string } => {
      const requiredAlumnosColumns = [
        'Fecha', 'Nombre', 'Apellido', 'Email', 'Rubro', 'Emprendimiento',
        'Descripción', 'Puntaje', 'Tutor1', 'Tutor2', 'Tutor3', 'Tutor4', 'Tutor5'
      ];

      const requiredTutoresColumns = [
        'Nombre', 'Apellido'
      ];

      const lines = text.trim().split('\n');
      if (lines.length === 0) return { data: [], columns: [], error: 'Archivo CSV vacío' };

      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

      // Validate required columns
      const requiredColumns = type === 'alumnos' ? requiredAlumnosColumns : requiredTutoresColumns;
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));
      if (missingColumns.length > 0) {
        return {
          data: [],
          columns: [],
          error: `Faltan las siguientes columnas requeridas: ${missingColumns.join(', ')}`
        };
      }

      // Use required columns for both types
      const columnsToUse = requiredColumns;
      const columns: GridColDef[] = columnsToUse.map(header => ({
        field: header,
        headerName: header,
        width: header === 'Descripción' ? 250 :
          header === 'Email' ? 200 :
            header === 'Nombre' || header === 'Apellido' ? 120 :
              header === 'Puntaje' ? 80 : 150,
        sortable: true,
      }));

      const data: any[] = [];
      const validationErrors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row: any = { id: i - 1 };

        columnsToUse.forEach((header) => {
          const headerIndex = headers.indexOf(header);
          const value = headerIndex !== -1 ? (values[headerIndex] || '') : '';

          // Validate Puntaje for alumnos
          if (type === 'alumnos' && header === 'Puntaje' && value !== '') {
            const numericValue = parseFloat(value);
            if (isNaN(numericValue) || numericValue < 0 || numericValue > 10) {
              validationErrors.push(`Fila ${i + 1}: El puntaje "${value}" debe ser un número entre 0 y 10`);
            }
          }

          // Validate required fields for tutores
          if (type === 'tutores' && (header === 'Nombre' || header === 'Apellido') && value.trim() === '') {
            validationErrors.push(`Fila ${i + 1}: El campo "${header}" es requerido y no puede estar vacío`);
          }

          row[header] = value;
        });
        data.push(row);
      }

      // Return validation errors if any
      if (validationErrors.length > 0) {
        return {
          data: [],
          columns: [],
          error: `Errores de validación:\n${validationErrors.slice(0, 5).join('\n')}${validationErrors.length > 5 ? `\n... y ${validationErrors.length - 5} errores más` : ''}`
        };
      }

      return { data, columns };
    };

    const file = event.target.files?.[0];
    if (file) {
      // Check file extension and MIME type
      const isCSV = file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/vnd.ms-excel';
      if (!isCSV) {
        alert('Error: Solo se permiten archivos CSV');
        event.target.value = ''; // Reset input
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        let { data, columns, error } = parseCSV(text, type);

        if (error) {
          alert(`Error en el archivo CSV: ${error}`);
          event.target.value = ''; // Reset input
        } else {
          dispatch(setFile({ type, fileName: file.name, data, columns }))
        }
      };
      reader.readAsText(file);
    }
  };

  const downloadExampleCSV = (type: 'alumnos' | 'tutores') => {
    const filename = type === 'alumnos' ? 'alumnos.csv' : 'tutores.csv';
    const link = document.createElement('a');
    // Use the base URL for both dev and production
    const baseUrl = import.meta.env.BASE_URL;
    link.href = `${baseUrl}${filename}`;
    link.download = `ejemplo_${filename}`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const Tutores = () => {
    const tutoresFileName = useSelector((state: RootState) => state.app.tutoresFileName);
    const tutoresData = useSelector((state: RootState) => state.app.tutoresData);
    const tutoresColumns = useSelector((state: RootState) => state.app.tutoresColumns);

    return <Box sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>Gestión de Tutores ({tutoresData.length} registros)</Typography>
        {tutoresFileName && (
          <Box sx={{ color: 'info.main', borderRadius: 1 }}>
            <Typography variant="body1">{tutoresFileName}</Typography>
          </Box>
        )}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button component="label" variant="contained" startIcon={<UploadFileIcon />}  >
            Subir CSV
            <input type="file" accept=".csv" onChange={(e) => handleFileUpload(e, 'tutores')} hidden />
          </Button>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => downloadExampleCSV('tutores')} >
            Descargar Plantilla
          </Button>
        </Box>
      </Box>

      {tutoresData.length > 0 && (
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <DataGrid
            density="compact"
            rows={tutoresData}
            columns={tutoresColumns}
            initialState={{ pagination: { paginationModel: { pageSize: 100 } } }}
          />
        </Box>
      )}
    </Box>
  };

  const Alumnos = () => {
    const alumnosFileName = useSelector((state: RootState) => state.app.alumnosFileName);
    const alumnosData = useSelector((state: RootState) => state.app.alumnosData);
    const alumnosColumns = useSelector((state: RootState) => state.app.alumnosColumns);

    return <Box sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>Gestión de Alumnos ({alumnosData.length} registros)</Typography>
        {alumnosFileName && (
          <Box sx={{ color: 'info.main', borderRadius: 1 }}>
            <Typography variant="body1">{alumnosFileName}</Typography>
          </Box>
        )}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button component="label" variant="contained" startIcon={<UploadFileIcon />}  >
            Subir CSV
            <input type="file" accept=".csv" onChange={(e) => handleFileUpload(e, 'alumnos')} hidden />
          </Button>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => downloadExampleCSV('alumnos')} >
            Descargar Plantilla
          </Button>
        </Box>
      </Box>

      {alumnosData.length > 0 && (
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <DataGrid
            density="compact"
            rows={alumnosData}
            columns={alumnosColumns}
            initialState={{ pagination: { paginationModel: { pageSize: 100 } } }}
          />
        </Box>
      )}
    </Box>
  };

  const Parametros = () => {
    const dispatch = useDispatch<AppDispatch>();

    const ParametrosMaraton = () => {

      const RecalculateButton = () => {

        const onRecalculate = () => {
          console.log('Handle Recalculate triggered');
          dispatch(optimizeGroups());
        };

        const running = useSelector((state: RootState) => state.app.running);
        const alumnosData = useSelector((state: RootState) => state.app.alumnosData);
        const tutoresData = useSelector((state: RootState) => state.app.tutoresData);

        return <Button variant="contained" onClick={onRecalculate} disabled={running || !alumnosData || !tutoresData} sx={{ bgcolor: 'primary.main' }} >
          Recalcular Grupos
        </Button>
      };

      const NumericMinMaxInput = <K extends keyof RootState["app"]["parameters"]>(props: { minKey: K, maxKey: K, min: number, max: number }) => {

        const MinInput = () => {
          const minValue = useSelector((state: RootState) => state.app.parameters[props.minKey]) as number;
          return <TextField
            type="number"
            value={minValue}
            onChange={(e) => dispatch(setParameters({ [props.minKey]: Number(e.target.value) }))}
            label="Mínimo"
            variant="outlined"
          />
        }

        const MaxInput = () => {
          const maxValue = useSelector((state: RootState) => state.app.parameters[props.maxKey]) as number;
          return <TextField
            type="number"
            value={maxValue}
            onChange={(e) => dispatch(setParameters({ [props.maxKey]: Number(e.target.value) }))}
            label="Máximo"
            variant="outlined"
          />
        }

        return <Box sx={{ display: 'flex', gap: 3 }}>
          <MinInput />
          <MaxInput />
        </Box>
      };

      const PesoRelativoTutores = () => {
        const pesoRelativoTutores = useSelector((state: RootState) => state.app.parameters.pesoRelativoTutores);
        const handlePesoChange = (index: number, value: string) => {
          const newPesos = [...pesoRelativoTutores];
          newPesos[index] = Number(value);
          dispatch(setParameters({ pesoRelativoTutores: newPesos }));
        };
        return <Box sx={{ display: 'flex', gap: 1 }}>
          {pesoRelativoTutores.map((peso: number, index: number) => (
            <Box key={index}>
              <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                Tutor {index + 1}
              </Typography>
              <input
                type="number"
                value={peso}
                onChange={(e) => handlePesoChange(index, e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '16px',
                  width: '60px'
                }}
              />
            </Box>
          ))}
        </Box>
      };

      const SensibilidadCoincidencia = () => {
        const similarityThreshold = useSelector((state: RootState) => state.app.parameters.similarityThreshold);
        return <Box sx={{ alignItems: 'center', gap: 2, paddingTop: "0rem" }}>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Sensibilidad de coincidencia de nombres: {(similarityThreshold * 100).toFixed(0)}%
          </Typography>
          <Typography variant="caption">Estricto</Typography>
          <input
            type="range"
            min="0"
            max="100"
            value={similarityThreshold * 100}
            onChange={(e) => dispatch(setParameters({ similarityThreshold: Number(e.target.value) / 100 }))}
            style={{
              width: '300px',
              cursor: 'pointer'
            }}
          />
          <Typography variant="caption">Flexible</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            0% = Solo coincidencias exactas | 100% = Acepta variaciones (acentos, abreviaciones)
          </Typography>
        </Box>
      }

      return <>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" fontWeight={600} children={"Parámetros de la Maratón"} />
          <RecalculateButton />
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 400 }}>
          <Box>
            <Typography variant="body1" sx={{ mb: 1 }} children={"Cantidad de Grupos"} />
            <NumericMinMaxInput minKey="minCantidadGrupos" maxKey="maxCantidadGrupos" min={1} max={100} />
          </Box>
          <Box>
            <Typography variant="body1" sx={{ mb: 1 }} children={"Alumnos por Grupo"} />
            <NumericMinMaxInput minKey="minAlumnosPorGrupo" maxKey="maxAlumnosPorGrupo" min={1} max={100} />
          </Box>
          <Box>
            <Typography variant="body1" sx={{ mb: 1 }} children={"Tutores por Grupo"} />
            <NumericMinMaxInput minKey="minTutoresPorGrupo" maxKey="maxTutoresPorGrupo" min={1} max={100} />
          </Box>
          <Box>
            <Typography variant="body1" sx={{ mb: 1 }} children={"Peso Relativo Tutores"} />
            <PesoRelativoTutores />
          </Box>
          < SensibilidadCoincidencia />
        </Box>
      </>
    };

    const ParametrosGeneticos = () => {

      const NumericInput = <K extends keyof RootState["app"]["parameters"]>(props: { k: K, label: string, min: number, max: number, comment: string }) => {

        const value = useSelector((state: RootState) => state.app.parameters[props.k]) as number;
        return <Box sx={{ gap: 3 }}>
          <TextField
            type="number"
            value={value}
            onChange={(e) => dispatch(setParameters({ [props.k]: Number(e.target.value) }))}
            label={props.label}
            variant="outlined"
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {props.comment}
          </Typography>
        </Box>

      };

      return <>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, paddingTop: "2rem" }}>
          <Typography variant="h5" fontWeight={600} children={"Parámetros Genéticos"} />
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 400 }}>
          <NumericInput k={"seed"} label="Semilla" min={1} max={999999999999999} comment={"Para resultados reproducibles"} />
          <NumericInput k={"geneticIterations"} label="Iteracions" min={1} max={1000} comment={"Más iteraciones = mejor solución pero más lento"} />
          <NumericInput k={"populationSize"} label="Tamaño Población" min={10} max={1000} comment={"Más población = más diversidad"} />
          <NumericInput k={"mutationRate"} label="Ratio Mutación" min={0} max={1} comment={"5-20% típico (previene convergencia prematura)"} />
          <NumericInput k={"crossoverRate"} label="Ratio Crossover" min={0} max={1} comment={"60-90% típico (mezcla de soluciones)"} />
          <NumericInput k={"tournamentSize"} label="Tamaño Torneo" min={1} max={50} comment={"2-3 exploración, 4-5 explotación"} />
          <NumericInput k={"elitismCount"} label="Elitismo" min={1} max={10} comment={"Mejores individuos que pasan sin cambios"} />
        </Box>

      </>
    };

    return <Box sx={{ p: 3, overflowY: 'auto', height: '100%' }}>
      <ParametrosMaraton />
      <ParametrosGeneticos />
    </Box>;
  };

  const Resultados = () => {
    // Get data from Redux store
    const result = useSelector((state: RootState) => state.app.result) as Result | null;
    const alumnosData = useSelector((state: RootState) => state.app.alumnosData);
    const tutoresData = useSelector((state: RootState) => state.app.tutoresData);
    const pesoRelativoTutores = useSelector((state: RootState) => state.app.parameters.pesoRelativoTutores);
    const similarityThreshold = useSelector((state: RootState) => state.app.parameters.similarityThreshold);

    // Helper functions
    const normalizeName = (name: string) => {
      if (!name) return '';
      return name.toLowerCase()
        .replace(/á/g, 'a')
        .replace(/é/g, 'e')
        .replace(/í/g, 'i')
        .replace(/ó/g, 'o')
        .replace(/ú/g, 'u')
        .replace(/ñ/g, 'n')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const calculateSimilarity = (str1: string, str2: string): number => {
      const levenshteinDistance = (s1: string, s2: string): number => {
        const m = s1.length;
        const n = s2.length;
        const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        for (let i = 1; i <= m; i++) {
          for (let j = 1; j <= n; j++) {
            if (s1[i - 1] === s2[j - 1]) {
              dp[i][j] = dp[i - 1][j - 1];
            } else {
              dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + 1
              );
            }
          }
        }
        return dp[m][n];
      };

      if (!str1 || !str2) return 0;
      const norm1 = normalizeName(str1);
      const norm2 = normalizeName(str2);
      if (norm1 === norm2) return 1.0;
      const maxLen = Math.max(norm1.length, norm2.length);
      if (maxLen === 0) return 1.0;
      const distance = levenshteinDistance(norm1, norm2);
      return Math.max(0, 1 - (distance / maxLen));
    };

    const calculateMatchScore = (alumno: any, groupTutores: string[]): { score: number, maxScore: number } => {
      let score = 0;
      let maxScore = 0;
      for (let i = 1; i <= 5; i++) {
        const tutorPref = alumno[`Tutor${i}`];
        if (tutorPref) {
          const peso = pesoRelativoTutores[i - 1] || 0;
          maxScore += peso;
          const found = groupTutores.some(groupTutor => {
            const similarity = calculateSimilarity(tutorPref, groupTutor);
            const threshold = 1.0 - similarityThreshold;
            return similarity >= threshold;
          });
          if (found) score += peso;
        }
      }
      return { score, maxScore };
    };

    // If no result, show loading message
    if (!result || !result.history) {
      return (
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" fontWeight={600} sx={{ mb: 2 }}>
            Resultados de la Asignación
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Ejecuta el algoritmo de optimización para ver los resultados de la asignación.
          </Typography>
        </Box>
      );
    }

    // Extract data from result
    const champion = result.history.champion;
    const grupos = champion.grupos || [];
    const totalAlumnos = champion.alumnosIds ? champion.alumnosIds.length : 0;
    const alumnosAsignados = grupos.reduce((sum: number, grupo: Grupo) =>
      sum + (grupo.alumnos ? grupo.alumnos.length : 0), 0);
    const alumnosSinAsignar = totalAlumnos - alumnosAsignados;

    // Convert grupos for display (tutores as names)
    const displayGrupos = grupos.map((grupo, index) => ({
      id: index,
      name: `Grupo ${index + 1}`,
      tutores: grupo.tutores?.map((t: Tutor) => `${t.nombre} ${t.apellido}`) || [],
      alumnos: grupo.alumnos || [],
      maxCapacity: 10 // You can adjust this based on parameters
    }));

    // Download CSV function
    const downloadResultsAsCSV = () => {
      const csvRows = ['Grupo,Nombre_Alumno,Apellido_Alumno,Email,Emprendimiento,Coincidencia,Tutores_Asignados'];

      displayGrupos.forEach((group: any) => {
        const tutoresString = group.tutores.join('; ');
        group.alumnos.forEach((alumno: any) => {
          // Find the original CSV data for this alumno
          const originalAlumno = alumnosData.find((a: any) =>
            a.Nombre === alumno.nombre && a.Apellido === alumno.apellido && a.Email === alumno.email
          ) as any;
          const { score, maxScore } = calculateMatchScore(originalAlumno || alumno, group.tutores);
          const row = [
            group.name,
            alumno.nombre || '',
            alumno.apellido || '',
            alumno.email || '',
            originalAlumno?.Emprendimiento || '',
            `${score}/${maxScore}`,
            `"${tutoresString}"`
          ].join(',');
          csvRows.push(row);
        });
      });

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `asignacion_grupos_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return (
      <Box sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" fontWeight={600}>
            Resultados de la Asignación
          </Typography>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={downloadResultsAsCSV}
            sx={{ bgcolor: 'success.main' }}
          >
            Descargar CSV
          </Button>
        </Box>

        {/* Statistics Summary */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Grupos Formados</Typography>
              <Typography variant="h6">{displayGrupos.length}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Total Alumnos</Typography>
              <Typography variant="h6">{totalAlumnos}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Asignados</Typography>
              <Typography variant="h6" color="success.main">{alumnosAsignados}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Sin Asignar</Typography>
              <Typography variant="h6" color={alumnosSinAsignar > 0 ? "warning.main" : "text.primary"}>
                {alumnosSinAsignar}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Fitness Final</Typography>
              <Typography variant="h6" color="primary.main">
                {champion.fitness ? champion.fitness.toFixed(2) : '0.00'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Iteraciones</Typography>
              <Typography variant="h6">
                {result.history.generations ? result.history.generations.length : 0}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Groups Details */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {/* Tutor Warnings */}
          {result.warnings && result.warnings.tutoresNotFound && result.warnings.tutoresNotFound.length > 0 && (
            <Box sx={{ mb: 3, bgcolor: '#ff980029', borderRadius: 1, border: '1px solid', borderColor: 'warning.main' }}>
              <Box
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  '&:hover': { bgcolor: '#ff980040' }
                }}
                onClick={() => {
                  const element = document.getElementById('tutor-warnings-content');
                  if (element) {
                    element.style.display = element.style.display === 'none' ? 'block' : 'none';
                  }
                  const arrow = document.getElementById('tutor-warnings-arrow');
                  if (arrow) {
                    arrow.style.transform = arrow.style.transform === 'rotate(180deg)' ? 'rotate(0deg)' : 'rotate(180deg)';
                  }
                }}
              >
                <Typography variant="h6" sx={{ color: 'warning.dark' }}>
                  ⚠️ Advertencias de Tutores ({result.warnings.tutoresNotFound.length})
                </Typography>
                <Typography
                  id="tutor-warnings-arrow"
                  variant="h6"
                  sx={{
                    color: 'warning.dark',
                    transition: 'transform 0.2s',
                    userSelect: 'none'
                  }}
                >
                  ▼
                </Typography>
              </Box>
              <Box
                id="tutor-warnings-content"
                sx={{
                  p: 2,
                  pt: 0,
                  display: 'block'
                }}
              >
                <Box>
                  {result.warnings.tutoresNotFound.map((warning: any, index: number) => (
                    <Typography key={index} variant="body2" sx={{ mb: 1, color: 'warning.dark' }}>
                      • Alumno {warning.alumno} buscó a {warning.tutor}
                      {warning.closest && ` (¿Quizás ${warning.closest}?)`}
                    </Typography>
                  ))}
                </Box>
                <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'warning.dark' }}>
                  Estos tutores no fueron encontrados o tienen baja coincidencia. Verifica la ortografía en el archivo de alumnos.
                </Typography>
              </Box>
            </Box>
          )}

          {/* Groups Collapsible Section */}
          <Box sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            mb: 2
          }}>
            <Box
              sx={{
                p: 2,
                bgcolor: 'grey.50',
                borderRadius: '4px 4px 0 0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                '&:hover': { bgcolor: 'grey.100' }
              }}
              onClick={() => {
                const element = document.getElementById('groups-content');
                if (element) {
                  element.style.display = element.style.display === 'none' ? 'block' : 'none';
                }
                const arrow = document.getElementById('groups-arrow');
                if (arrow) {
                  arrow.style.transform = arrow.style.transform === 'rotate(180deg)' ? 'rotate(0deg)' : 'rotate(180deg)';
                }
              }}
            >
              <Typography variant="h6">
                👥 Grupos Formados ({displayGrupos.length})
            </Typography>
            <Typography
              id="groups-arrow"
              variant="h6"
              sx={{
                transition: 'transform 0.2s',
                userSelect: 'none'
              }}
            >
              ▼
            </Typography>
          </Box>
          <Box
            id="groups-content"
            sx={{
              p: 2,
              pt: 0,
              display: 'block'
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              {displayGrupos.map((group: any) => (
                <Box key={group.id} sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'background.paper'
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {group.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {group.alumnos.length} / {group.maxCapacity} alumnos
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Tutores:
                    </Typography>
                    <Typography variant="body2">
                      {group.tutores.join(', ')}
                    </Typography>
                  </Box>

                  {group.alumnos.length > 0 && (
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Alumnos:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {group.alumnos.map((alumno: any, index: number) => {
                          // Find the original CSV data for this alumno
                          const originalAlumno = alumnosData.find((a: any) =>
                            a.Nombre === alumno.nombre && a.Apellido === alumno.apellido && a.Email === alumno.email
                          ) as any;
                          const { score, maxScore } = calculateMatchScore(originalAlumno || alumno, group.tutores);
                          const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

                          return (
                            <Box key={index} sx={{
                              px: 1,
                              py: 0.5,
                              bgcolor: 'grey.100',
                              borderRadius: 0.5,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1
                            }}>
                              <Typography variant="body2">
                                {alumno.nombre} {alumno.apellido}
                              </Typography>
                              <Typography variant="caption" sx={{
                                color: percentage >= 75 ? 'success.main' :
                                  percentage >= 50 ? '#FFC107' :
                                    percentage >= 25 ? 'warning.dark' :
                                      'error.main',
                                fontWeight: 600
                              }}>
                                ({score}/{maxScore})
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        {/* Student Satisfaction Ranking */}
        <Box sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          mb: 2
        }}>
          <Box
            sx={{
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: '4px 4px 0 0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              '&:hover': { bgcolor: 'grey.100' }
            }}
            onClick={() => {
              const element = document.getElementById('ranking-content');
              if (element) {
                element.style.display = element.style.display === 'none' ? 'block' : 'none';
              }
              const arrow = document.getElementById('ranking-arrow');
              if (arrow) {
                arrow.style.transform = arrow.style.transform === 'rotate(180deg)' ? 'rotate(0deg)' : 'rotate(180deg)';
              }
            }}
          >
            <Typography variant="h6">
              🏆 Ranking de Satisfacción ({displayGrupos.reduce((total: number, group: any) => total + group.alumnos.length, 0)} estudiantes)
            </Typography>
            <Typography
              id="ranking-arrow"
              variant="h6"
              sx={{
                transition: 'transform 0.2s',
                userSelect: 'none'
              }}
            >
              ▼
            </Typography>
          </Box>
          <Box
            id="ranking-content"
            sx={{
              p: 2,
              pt: 0,
              display: 'block'
            }}
          >
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 2fr', gap: 1, mb: 1, p: 1, bgcolor: 'grey.100', borderRadius: 0.5 }}>
                <Typography variant="body2" fontWeight={600}>Nombre</Typography>
                <Typography variant="body2" fontWeight={600}>Grupo</Typography>
                <Typography variant="body2" fontWeight={600}>% Satisfacción</Typography>
                <Typography variant="body2" fontWeight={600}>Tutores</Typography>
              </Box>
              {(() => {
                // Create ranking array
                const studentRanking: Array<{ name: string, group: string, satisfaction: number, tutorResults: Array<{ name: string, status: 'matched' | 'not_matched' | 'not_found' }> }> = [];

                // Uses the main normalizeName function

                // Uses the main calculateSimilarity function

                const tutorFullNames = tutoresData.map((t: any) => ({
                  original: `${t.Nombre} ${t.Apellido}`,
                  normalized: normalizeName(`${t.Nombre} ${t.Apellido}`),
                  firstName: t.Nombre,
                  lastName: t.Apellido
                }));
                const validTutorNames = tutorFullNames.map(t => t.original);


                displayGrupos.forEach((group: any) => {
                  group.alumnos.forEach((alumno: any) => {
                    // Find the original CSV data for this alumno
                    const originalAlumno = alumnosData.find((a: any) =>
                      a.Nombre === alumno.nombre && a.Apellido === alumno.apellido && a.Email === alumno.email
                    ) as any;
                    const { score, maxScore } = calculateMatchScore(originalAlumno || alumno, group.tutores);
                    const satisfaction = maxScore > 0 ? (score / maxScore) * 100 : 0;

                    // Calculate tutor matches with status
                    const tutorResults: Array<{ name: string, status: 'matched' | 'not_matched' | 'not_found' }> = [];

                    for (let i = 1; i <= 5; i++) {
                      const tutorPref = originalAlumno?.[`Tutor${i}`];
                      if (tutorPref) {
                        let foundInGroup = false;
                        let existsInDatabase = false;
                        let bestSimilarity = 0;

                        // Check against all valid tutors using same logic as warnings
                        for (const validTutor of validTutorNames) {
                          const similarity = calculateSimilarity(tutorPref, validTutor);
                          if (similarity > bestSimilarity) {
                            bestSimilarity = similarity;
                          }
                        }

                        // Use same threshold logic as warning system
                        const threshold = 1.0 - similarityThreshold;
                        if (bestSimilarity >= threshold) {
                          existsInDatabase = true;
                        }


                        // Check if tutor is in current group
                        for (const groupTutor of group.tutores) {
                          const similarity = calculateSimilarity(tutorPref, groupTutor);
                          if (similarity >= threshold) {
                            foundInGroup = true;
                            break;
                          }
                        }

                        if (foundInGroup) {
                          tutorResults.push({ name: tutorPref, status: 'matched' });
                        } else if (existsInDatabase) {
                          tutorResults.push({ name: tutorPref, status: 'not_matched' });
                        } else {
                          tutorResults.push({ name: tutorPref, status: 'not_found' });
                        }
                      }
                    }

                    studentRanking.push({
                      name: `${alumno.nombre} ${alumno.apellido}`,
                      group: group.name,
                      satisfaction: satisfaction,
                      tutorResults: tutorResults
                    });
                  });
                });

                // Sort by satisfaction (best to worst)
                studentRanking.sort((a, b) => b.satisfaction - a.satisfaction);

                return studentRanking.map((student, index) => (
                  <Box key={index} sx={{
                    display: 'grid',
                    gridTemplateColumns: '1.5fr 1fr 1fr 2fr',
                    gap: 1,
                    p: 1,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:hover': { bgcolor: 'grey.50' }
                  }}>
                    <Typography variant="body2">{student.name}</Typography>
                    <Typography variant="body2">{student.group}</Typography>
                    <Typography variant="body2" sx={{
                      color: student.satisfaction >= 75 ? 'success.main' :
                        student.satisfaction >= 50 ? '#FFC107' :
                          student.satisfaction >= 25 ? 'warning.dark' :
                            'error.main',
                      fontWeight: 600
                    }}>
                      {student.satisfaction.toFixed(1)}%
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {student.tutorResults.length > 0 ? student.tutorResults.map((tutor, tutorIndex) => (
                        <Typography
                          key={tutorIndex}
                          variant="caption"
                          sx={{
                            px: 0.5,
                            py: 0.25,
                            borderRadius: 0.5,
                            fontSize: '0.7rem',
                            fontWeight: 500,
                            color: 'white',
                            bgcolor: tutor.status === 'matched' ? 'success.main' :
                              tutor.status === 'not_matched' ? 'warning.main' :
                                'error.main'
                          }}
                        >
                          {tutor.name}
                        </Typography>
                      )) : (
                        <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                          Sin preferencias
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ));
              })()}
            </Box>
          </Box>
        </Box>

        {/* Tutor Ranking */}
        <Box sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          mb: 2
        }}>
          <Box
            sx={{
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: '4px 4px 0 0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              '&:hover': { bgcolor: 'grey.100' }
            }}
            onClick={() => {
              const element = document.getElementById('tutor-ranking-content');
              if (element) {
                element.style.display = element.style.display === 'none' ? 'block' : 'none';
              }
              const arrow = document.getElementById('tutor-ranking-arrow');
              if (arrow) {
                arrow.style.transform = arrow.style.transform === 'rotate(180deg)' ? 'rotate(0deg)' : 'rotate(180deg)';
              }
            }}
          >
            <Typography variant="h6">
              👨‍🏫 Ranking de Tutores ({tutoresData.length} tutores)
            </Typography>
            <Typography
              id="tutor-ranking-arrow"
              variant="h6"
              sx={{
                transition: 'transform 0.2s',
                userSelect: 'none'
              }}
            >
              ▼
            </Typography>
          </Box>
          <Box
            id="tutor-ranking-content"
            sx={{
              p: 2,
              pt: 0,
              display: 'block'
            }}
          >
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 1, mb: 1, p: 1, bgcolor: 'grey.100', borderRadius: 0.5 }}>
                <Typography variant="body2" fontWeight={600}>Tutor</Typography>
                <Typography variant="body2" fontWeight={600}>Selecciones</Typography>
                <Typography variant="body2" fontWeight={600}>Asignados</Typography>
                <Typography variant="body2" fontWeight={600}>% Efectividad</Typography>
              </Box>
              {(() => {
                // Create tutor ranking data
                const tutorStats: Array<{ name: string, selected: number, matched: number, effectiveness: number }> = [];

                // Uses the main normalizeName function

                // Count selections and matches for each tutor
                const validTutorNames = tutoresData.map((t: any) => `${t.Nombre} ${t.Apellido}`);

                validTutorNames.forEach(tutorName => {
                  let selectedCount = 0;
                  let matchedCount = 0;

                  displayGrupos.forEach((group: any) => {
                    group.alumnos.forEach((alumno: any) => {
                      // Find the original CSV data for this alumno
                      const originalAlumno = alumnosData.find((a: any) =>
                        a.Nombre === alumno.nombre && a.Apellido === alumno.apellido && a.Email === alumno.email
                      ) as any;
                      for (let i = 1; i <= 5; i++) {
                        const tutorPref = originalAlumno?.[`Tutor${i}`];
                        if (tutorPref) {
                          // Check if this preference matches current tutor (exact match after normalization)
                          const norm1 = normalizeName(tutorPref);
                          const norm2 = normalizeName(tutorName);

                          if (norm1 === norm2) {
                            selectedCount++;

                            // Check if student actually got this tutor in their group
                            const foundInGroup = group.tutores.some((groupTutor: string) => {
                              const normGroupTutor = normalizeName(groupTutor);
                              return normGroupTutor === norm2;
                            });

                            if (foundInGroup) {
                              matchedCount++;
                            }
                          }
                        }
                      }
                    });
                  });

                  const effectiveness = selectedCount > 0 ? (matchedCount / selectedCount) * 100 : 0;

                  tutorStats.push({
                    name: tutorName,
                    selected: selectedCount,
                    matched: matchedCount,
                    effectiveness: effectiveness
                  });
                });

                // Sort by selection count (most popular first), then by effectiveness
                tutorStats.sort((a, b) => {
                  if (a.selected !== b.selected) {
                    return b.selected - a.selected;
                  }
                  return b.effectiveness - a.effectiveness;
                });

                return tutorStats.map((tutor, index) => (
                  <Box key={index} sx={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr',
                    gap: 1,
                    p: 1,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:hover': { bgcolor: 'grey.50' }
                  }}>
                    <Typography variant="body2">{tutor.name}</Typography>
                    <Typography variant="body2" textAlign="center">{tutor.selected}</Typography>
                    <Typography variant="body2" textAlign="center" sx={{
                      color: tutor.matched > 0 ? 'success.main' : 'text.secondary'
                    }}>
                      {tutor.matched}
                    </Typography>
                    <Typography variant="body2" textAlign="center" sx={{
                      color: tutor.effectiveness >= 80 ? 'success.main' :
                        tutor.effectiveness >= 50 ? 'warning.main' :
                          tutor.effectiveness > 0 ? 'error.main' :
                            'text.secondary',
                      fontWeight: tutor.effectiveness > 0 ? 600 : 400
                    }}>
                      {tutor.selected > 0 ? `${tutor.effectiveness.toFixed(0)}%` : '-'}
                    </Typography>
                  </Box>
                ));
              })()}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
  };

  return <>
    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Tabs value={maratonTab} onChange={(_e: SyntheticEvent, v) => setMaratonTab(v)}>
        {tabs.map((tab) => <Tab key={tab} label={tab} value={tab} />)}
      </Tabs>
    </Box>
    <Box sx={{ flex: 1, overflow: 'hidden' }}>
      <CustomTabPanel value={maratonTab} index={"Tutores"} children={<Tutores />} />
      <CustomTabPanel value={maratonTab} index={"Alumnos"} children={<Alumnos />} />
      <CustomTabPanel value={maratonTab} index={"Parámetros"} children={<Parametros />} />
      <CustomTabPanel value={maratonTab} index={"Resultados"} children={<Resultados />} />
    </Box>
  </>;
};

const drawerWidth = 240;

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedSection, setSelectedSection] = useState<'tutorias' | 'maraton'>('maraton');

  const Sidebar = () => (<Drawer
    variant="permanent"
    open={sidebarOpen}
    sx={{
      width: sidebarOpen ? drawerWidth : 60,
      flexShrink: 0,
      '& .MuiDrawer-paper': { width: sidebarOpen ? drawerWidth : 60, boxSizing: 'border-box', transition: 'width 0.3s', overflowX: 'hidden' },
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1 }}>
      {sidebarOpen && (
        <Box sx={{ width: '100%', px: 1 }}>
          <img
            src="emprending.png"
            alt="Emprending Logo"
            style={{ width: '100%', height: 'auto', transform: 'scaleY(0.9)' }}
          />
        </Box>
      )}
      <IconButton onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? <ChevronLeftIcon /> : <MenuIcon />}
      </IconButton>
    </Box>
    <Divider />
    <List>
      <ListItem disablePadding>
        <ListItemButton selected={selectedSection === 'tutorias'} onClick={() => setSelectedSection('tutorias')} >
          <ListItemIcon>
            <SchoolIcon />
          </ListItemIcon>
          {sidebarOpen && <ListItemText primary="Tutorías" />}
        </ListItemButton>
      </ListItem>
      <ListItem disablePadding>
        <ListItemButton selected={selectedSection === 'maraton'} onClick={() => setSelectedSection('maraton')} >
          <ListItemIcon>
            <GroupsIcon />
          </ListItemIcon>
          {sidebarOpen && <ListItemText primary="Maratón" />}
        </ListItemButton>
      </ListItem>
    </List>
  </Drawer>
  );

  return (<Box sx={{ display: 'flex', width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0 }}>
    <Sidebar />
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {selectedSection === 'tutorias' && <Tutorias />}
      {selectedSection === 'maraton' && <Maraton />}
    </Box>
    <OptimizationProgressModal />
  </Box>);
}
