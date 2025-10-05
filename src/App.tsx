import { useState, type SyntheticEvent } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import './App.css'

import * as React from 'react';
import { Box, Button, Checkbox, Divider, Drawer, TextField, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Tab, Tabs, Typography, Modal, LinearProgress } from '@mui/material';
import { ChevronLeft as ChevronLeftIcon, Download as DownloadIcon, Groups as GroupsIcon, School as SchoolIcon, UploadFile as UploadFileIcon } from '@mui/icons-material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import type { RootState, AppDispatch } from './store/store';
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

  inequalityAversion: number; // 1 - 3 // 1 is linear, bigger value tend to favor middle values
  maxGroupsPerStudent: number;
  slotsAreTimeFrames: boolean;
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

// interface Generation {
//   i: number;
//   inititialTime: number;
//   endTime: number | null;

//   individuals: string[];
//   tournments: {
//     groupA: string[];
//     groupB: string[];
//     result: {
//       parentA: string;
//       parentB: string;
//       offspring: string;
//       crossover: boolean;
//     }
//   }[];

//   shuffleRepeats: number;

//   // Fitness statistics
//   bestFitness: number;
//   worstFitness: number;
//   averageFitness: number;
// };

interface Result {
  warnings: Warnings;
  geneticSummary: {
    inititialTime: number,
    endTime: number,
    shuffleRepeats: number,
    bestFitness: number,
    worstFitness: number,
    averageFitness: number,
  }[],
  combinationsN: number,
  inititialTime: number,
  endTime: number,
  champion: Individual,
  worst: Individual,
  parameters: OptimizationParameters,
  alumnos: Alumno[],
  tutores: Tutor[]
};

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
                {combinations || 0}
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
      // Proper CSV parser that handles quoted fields with commas and newlines
      const parseCSVRows = (text: string): string[][] => {
        const rows: string[][] = [];
        let currentRow: string[] = [];
        let currentField = '';
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          const nextChar = text[i + 1];

          if (char === '"' && inQuotes && nextChar === '"') {
            // Escaped quote
            currentField += '"';
            i++; // Skip next quote
          } else if (char === '"') {
            // Toggle quote state
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            // Field separator
            currentRow.push(currentField.trim());
            currentField = '';
          } else if ((char === '\n' || char === '\r') && !inQuotes) {
            // Row separator (handle both \n and \r\n)
            if (char === '\r' && nextChar === '\n') {
              i++; // Skip the \n in \r\n
            }
            currentRow.push(currentField.trim());
            if (currentRow.some(f => f !== '')) { // Only add non-empty rows
              rows.push(currentRow);
            }
            currentRow = [];
            currentField = '';
          } else {
            currentField += char;
          }
        }

        // Add last field and row if any
        if (currentField || currentRow.length > 0) {
          currentRow.push(currentField.trim());
          if (currentRow.some(f => f !== '')) {
            rows.push(currentRow);
          }
        }

        return rows;
      };

      const requiredAlumnosColumns = [
        'Fecha', 'Nombre', 'Apellido', 'Email', 'Rubro', 'Emprendimiento',
        'Descripción', 'Puntaje', 'Tutor1', 'Tutor2', 'Tutor3', 'Tutor4', 'Tutor5'
      ];

      const requiredTutoresColumns = [
        'Nombre', 'Apellido'
      ];

      const rows = parseCSVRows(text.trim());
      if (rows.length === 0) return { data: [], columns: [], error: 'Archivo CSV vacío' };

      let headers = rows[0];

      // Detect alternative alumnos format (e.g., "Inscripción Maratón" Google Forms export)
      // This format has "Marca temporal", "Nombre completo", etc.
      if (type === 'alumnos' && headers.includes('Marca temporal') && headers.includes('Nombre completo')) {
        const data: any[] = [];
        const marcaTemporalIdx = headers.indexOf('Marca temporal');
        const emailIdx = headers.indexOf('Dirección de correo electrónico');
        const nombreCompletoIdx = headers.indexOf('Nombre completo');
        const emprendimientoIdx = headers.indexOf('Emprendimiento (Nombre, web, redes)');

        for (let i = 1; i < rows.length; i++) {
          const values = rows[i];
          const nombreCompleto = values[nombreCompletoIdx] || '';

          // Skip empty rows
          if (!nombreCompleto.trim()) continue;

          const nameParts = nombreCompleto.trim().split(/\s+/);
          const nombre = nameParts[0] || '';
          const apellido = nameParts.slice(1).join(' ') || '';

          const row: any = {
            id: data.length,
            Fecha: values[marcaTemporalIdx] || '',
            Nombre: nombre,
            Apellido: apellido,
            Email: values[emailIdx] || '',
            Rubro: '', // Not in alternative format
            Emprendimiento: values[emprendimientoIdx] || '',
            Descripción: '', // Not in alternative format
            Puntaje: '10', // Default to 10 as requested
          };

          // Extract tutors (Tutor 1, Tutor 2, etc.)
          for (let tutorNum = 1; tutorNum <= 5; tutorNum++) {
            const tutorIdx = headers.indexOf(`Tutor ${tutorNum}`);
            row[`Tutor${tutorNum}`] = tutorIdx !== -1 ? (values[tutorIdx] || '') : '';
          }

          data.push(row);
        }

        const columns: GridColDef[] = requiredAlumnosColumns.map(header => ({
          field: header,
          headerName: header,
          width: header === 'Descripción' ? 250 :
            header === 'Email' ? 200 :
              header === 'Nombre' || header === 'Apellido' ? 120 :
                header === 'Puntaje' ? 80 : 150,
          sortable: true,
        }));

        return { data, columns };
      }

      // Detect alternative tutores format (e.g., "Inscripción Maratón" format)
      // This format has "Tutores" as the second column header
      if (type === 'tutores' && headers.includes('Tutores')) {
        // Parse alternative format: extract nombre from "Tutores" column (format: "Nombre Apellido")
        const tutoresColumnIndex = headers.indexOf('Tutores');
        const data: any[] = [];

        for (let i = 1; i < rows.length; i++) {
          const values = rows[i];
          const fullName = values[tutoresColumnIndex];

          // Skip empty rows and rows with "TOTAL"
          if (fullName && fullName.trim() !== '' && !fullName.toUpperCase().includes('TOTAL')) {
            const nameParts = fullName.trim().split(/\s+/);
            const nombre = nameParts[0] || '';
            const apellido = nameParts.slice(1).join(' ') || '';

            data.push({
              id: data.length,
              Nombre: nombre,
              Apellido: apellido
            });
          }
        }

        const columns: GridColDef[] = [
          { field: 'Nombre', headerName: 'Nombre', width: 120, sortable: true },
          { field: 'Apellido', headerName: 'Apellido', width: 120, sortable: true }
        ];

        return { data, columns };
      }

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

      for (let i = 1; i < rows.length; i++) {
        const values = rows[i];
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

      const ErrorModal = () => {
        const optimizationError = useSelector((state: RootState) => state.app.optimizationError);
        const dispatch = useDispatch<AppDispatch>();

        const handleClose = () => {
          dispatch({ type: 'app/clearOptimizationError' });
        };

        return (
          <Modal
            open={!!optimizationError}
            onClose={handleClose}
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 24, p: 4, minWidth: 400, maxWidth: 600 }}>
              <Typography variant="h5" sx={{ mb: 3, textAlign: 'center', fontWeight: 600, color: 'error.main' }}>
                ❌ Error en la Optimización
              </Typography>

              <Box sx={{ mb: 3, p: 2, bgcolor: '#ffebee', borderRadius: 1, border: '1px solid', borderColor: 'error.main' }}>
                <Typography variant="body1" sx={{ color: 'error.dark', whiteSpace: 'pre-wrap' }}>
                  {optimizationError}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Button variant="contained" color="error" onClick={handleClose}>
                  Cerrar
                </Button>
              </Box>
            </Box>
          </Modal>
        );
      }

      const RecalculateButton = () => {

        const running = useSelector((state: RootState) => state.app.running);
        const alumnosData = useSelector((state: RootState) => state.app.alumnosData);
        const tutoresData = useSelector((state: RootState) => state.app.tutoresData);

        const onRecalculate = () => {
          console.log('Handle Recalculate triggered');
          dispatch(optimizeGroups());
        };

        return <Button variant="contained" onClick={onRecalculate} disabled={running || !alumnosData?.length || !tutoresData?.length} sx={{ bgcolor: 'primary.main' }} >
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

      const AberracionInjusticia = () => {
        const inequalityAversion = useSelector((state: RootState) => state.app.parameters.inequalityAversion);
        return <Box sx={{ alignItems: 'center', gap: 2, paddingTop: "0rem" }}>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Aberración a la injusticia: {inequalityAversion.toFixed(2)}
          </Typography>
          <input type="range" min="0" max="9" step={0.1}
            value={Math.pow(inequalityAversion, 2)}
            onChange={(e) => dispatch(setParameters({ inequalityAversion: Math.pow(Number(e.target.value), 1 / 2) }))}
            style={{ width: '300px', cursor: 'pointer' }}
          />
        </Box>
      };

      const Horarios = () => {
        const slotsAreTimeFrames = useSelector((state: RootState) => state.app.parameters.slotsAreTimeFrames);
        return <Box sx={{ alignItems: 'center', gap: 2, paddingTop: "0rem", display: "flex" }}>
          <Typography variant="body1">
            Horarios
          </Typography>
          <Checkbox
            checked={slotsAreTimeFrames}
            onChange={(e) => dispatch(setParameters({
              slotsAreTimeFrames: e.target.checked,
              maxGroupsPerStudent: e.target.checked ? 5 : 1
            }))}
          />
        </Box>
      };

      const SensibilidadCoincidencia = () => {
        const similarityThreshold = useSelector((state: RootState) => state.app.parameters.similarityThreshold);
        return <Box sx={{ alignItems: 'center', gap: 2, paddingTop: "0rem" }}>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Sensibilidad de coincidencia de nombres: {(similarityThreshold * 100).toFixed(0)}%
          </Typography>
          {/* <Typography variant="caption">Flexible</Typography> */}
          <input
            type="range"
            min="0"
            max="100"
            value={similarityThreshold * 100}
            onChange={(e) => dispatch(setParameters({ similarityThreshold: Number(e.target.value) / 100 }))}
            style={{ width: '300px', cursor: 'pointer' }}
          />
          {/* <Typography variant="caption">Estricto</Typography> */}
          {/* <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            0% = Acepta variaciones (acentos, abreviaciones) | 100% = Solo coincidencias exactas
          </Typography> */}
        </Box>
      };

      return <>
        <ErrorModal />
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
          <Horarios />
          <AberracionInjusticia />
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
    const result = useSelector((state: RootState) => state.app.result) as Result;
    const alumnos = useSelector((state: RootState) => state.app.result?.alumnos) as Alumno[];
    const alumnosData = useSelector((state: RootState) => state.app.alumnosData);
    const tutoresData = useSelector((state: RootState) => state.app.tutoresData);
    const pesoRelativoTutores = useSelector((state: RootState) => state.app.parameters.pesoRelativoTutores);
    const similarityThreshold = useSelector((state: RootState) => state.app.parameters.similarityThreshold);
    const maxTeoricalFitness = useSelector((state: RootState) => state.app.maxTeoricalFitness);

    // Extract data from result
    const champion = result?.champion;
    const grupos = champion?.grupos;
    const peticionesCount = alumnos?.reduce((p, x) => p + x?.tutores?.filter(x => x).length, 0)
    const asignacionesCount = grupos
      ?.reduce((sum: number, grupo: Grupo) => sum + (grupo.alumnos?.length || 0), 0);

    //const asignaciones = champion.

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
    if (!result) {
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
      // Helper to escape CSV field (handles commas, quotes, newlines)
      const escapeCSVField = (field: string): string => {
        if (!field) return '';
        const stringField = String(field);
        // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n') || stringField.includes('\r')) {
          return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
      };

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
            escapeCSVField(group.name),
            escapeCSVField(alumno.nombre || ''),
            escapeCSVField(alumno.apellido || ''),
            escapeCSVField(alumno.email || ''),
            escapeCSVField(originalAlumno?.Emprendimiento || ''),
            escapeCSVField(`${score}/${maxScore}`),
            escapeCSVField(tutoresString)
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
          <Typography children={"Resultados de la Asignación"} variant="h5" fontWeight={600} />
          <Button children={"Descargar CSV"} variant="contained" startIcon={<DownloadIcon />} onClick={downloadResultsAsCSV} sx={{ bgcolor: 'success.main' }} />
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
              <Typography variant="h6">{alumnos.length}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Asignados</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                {(() => {
                  // Calculate score ranges using the same logic as the individual student display
                  //const scoreRanges = { high: 0, medium: 0, low: 0, veryLow: 0 };

                  const scoreRanges = alumnos.reduce((p, a) => {
                    const score = a.tutores.reduce((sum, t, idx) => {
                      if (grupos.find(g => g.alumnos.find(x => x.id === a.id) && g.tutores.find(x => x.id === t.id))) {
                        sum = sum + pesoRelativoTutores[idx]
                      }
                      return sum;
                    }, 0);

                    const maxScore = a.tutores.reduce((sum, _, idx) => sum + pesoRelativoTutores[idx], 0);

                    const percentage = maxScore > 0 ? (score / maxScore) : 0;
                    if (percentage >= 0.75) p.high++;
                    else if (percentage >= 0.5) p.medium++;
                    else if (percentage >= 0.25) p.low++;
                    else p.veryLow++;
                    return p;
                  }, { high: 0, medium: 0, low: 0, veryLow: 0 })

                  // grupos.forEach((grupo: Grupo) => {
                  //   const tutoresIds = grupo.tutores.map(x => x.id);
                  //   grupo.alumnos.forEach((alumno: Alumno) => {
                  //     const score = alumno.tutores.reduce((sum, _, idx) =>
                  //       sum + (tutoresIds.includes(alumno.tutores[idx].id) ? (pesoRelativoTutores[idx] || 0) : 0), 0);
                  //     const maxScore = alumno.tutores.reduce((sum, _, idx) =>
                  //       sum + (pesoRelativoTutores[idx] || 0), 0);

                  //     const percentage = maxScore > 0 ? (score / maxScore) : 0;

                  //     if (percentage >= 0.75) scoreRanges.high++;
                  //     else if (percentage >= 0.5) scoreRanges.medium++;
                  //     else if (percentage >= 0.25) scoreRanges.low++;
                  //     else scoreRanges.veryLow++;
                  //   });
                  // });

                  return (
                    <>
                      {scoreRanges.high > 0 && <Typography variant="h6" marginRight={'1rem'} fontWeight={600} color='success.main' children={scoreRanges.high} />}
                      {scoreRanges.medium > 0 && <Typography variant="h6" marginRight={'1rem'} fontWeight={600} color='#FFC107' children={scoreRanges.medium} />}
                      {scoreRanges.low > 0 && <Typography variant="h6" marginRight={'1rem'} fontWeight={600} color='warning.main' children={scoreRanges.low} />}
                      {scoreRanges.veryLow > 0 && <Typography variant="h6" marginRight={'1rem'} fontWeight={600} color='error.main' children={scoreRanges.veryLow} />}
                    </>
                  );
                })()}
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Total Asignaciones</Typography>
              <Typography variant="h6" color={"text.primary"}>
                {asignacionesCount} / {peticionesCount}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Satisfacción Total</Typography>
              <Typography variant="h6" fontWeight={600} color={
                (() => {
                  let coef = champion.fitness / (maxTeoricalFitness || 0);
                  if (coef > 0.8) return 'success.main';
                  if (coef > 0.6) return '#FFC107';
                  if (coef > 0.5) return 'warning.main';
                  if (coef > 0.25) return 'error.main';
                  return 'error.main';
                })()
              }>
                {(() => {
                  if (!champion.fitness) return '0.00%';
                  const percentage = (champion.fitness / (maxTeoricalFitness || 0)) * 100;
                  return `${Math.min(percentage, 100).toFixed(1)}%`;
                })()}
              </Typography>
            </Box>
            {/* <Box>
              <Typography variant="caption" color="text.secondary">Iteraciones</Typography>
              <Typography variant="h6">
                {result?.geneticSummary?.length || 0}
              </Typography>
            </Box> */}
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
                    const isHidden = element.style.display === 'none' || !element.style.display;
                    element.style.display = isHidden ? 'block' : 'none';
                  }
                  const arrow = document.getElementById('tutor-warnings-arrow');
                  if (arrow) {
                    arrow.style.transform = arrow.style.transform === 'rotate(180deg)' ? 'rotate(0deg)' : 'rotate(180deg)';
                  }
                }}
              >
                <Typography variant="h6" sx={{ color: 'warning.dark' }}>
                  ⚠️ Advertencias ({result.warnings.tutoresNotFound.length})
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
                  display: 'none'
                }}
              >
                <Box>
                  {result.warnings.tutoresNotFound.map((warning: any, index: number) => (
                    <Box key={index} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ color: 'warning.dark' }}>
                        • Alumno {warning.alumno} buscó a {warning.tutor}
                        {warning.closest && ` (¿Quizás ${warning.closest}?)`}
                      </Typography>
                      {warning.score !== undefined && (
                        <Typography
                          variant="caption"
                          sx={{
                            px: 1,
                            py: 0.25,
                            borderRadius: 0.5,
                            fontWeight: 600,
                            bgcolor: warning.score >= 0.75 ? '#4caf5020' :
                              warning.score >= 0.5 ? '#ff980020' :
                                '#f4433620',
                            color: warning.score >= 0.75 ? 'success.main' :
                              warning.score >= 0.5 ? 'warning.main' :
                                'error.main'
                          }}
                        >
                          {(warning.score * 100).toFixed(0)}% coincidencia
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
                <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'warning.dark' }}>
                  Estos tutores no fueron encontrados o tienen baja coincidencia. Verifica la ortografía en el archivo de alumnos.
                </Typography>
              </Box>
            </Box>
          )}

          {/* Time Slots Table - Only visible if slotsAreTimeFrames is true */}
          {result.parameters.slotsAreTimeFrames && (
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
                  const element = document.getElementById('timeslots-content');
                  if (element) {
                    const isHidden = element.style.display === 'none' || !element.style.display;
                    element.style.display = isHidden ? 'block' : 'none';
                  }
                  const arrow = document.getElementById('timeslots-arrow');
                  if (arrow) {
                    arrow.style.transform = arrow.style.transform === 'rotate(180deg)' ? 'rotate(0deg)' : 'rotate(180deg)';
                  }
                }}
              >
                <Typography variant="h6">
                  🕒 Horarios por Grupo ({displayGrupos.length} grupos)
                </Typography>
                <Typography
                  id="timeslots-arrow"
                  variant="h6"
                  sx={{
                    transition: 'transform 0.2s',
                    userSelect: 'none'
                  }}
                >
                  ▼
                </Typography>
              </Box>
              <Box id="timeslots-content" sx={{ p: 2, pt: 0, display: 'none' }}>
                <Box sx={{ mt: 2, overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <thead>
                      <tr>
                        {displayGrupos.map((_grupo, index) => (
                          <th
                            key={index}
                            style={{
                              border: '1px solid #e0e0e0',
                              padding: '12px',
                              backgroundColor: '#f5f5f5',
                              fontWeight: 600,
                              textAlign: 'left',
                              minWidth: '200px',
                              width: '200px'
                            }}
                          >
                            Grupo {index + 1}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ height: '400px' }}>
                        {displayGrupos.map((grupo, index) => (
                          <td
                            key={index}
                            style={{
                              border: '1px solid #e0e0e0',
                              padding: '12px',
                              verticalAlign: 'top',
                              minWidth: '200px',
                              width: '200px',
                              height: '400px'
                            }}
                          >
                            {grupo.alumnos.map((alumno: Alumno, alumnoIndex: number) => (
                              <Box
                                key={alumnoIndex}
                                sx={{
                                  mb: 1,
                                  pb: 1,
                                  borderBottom: alumnoIndex < grupo.alumnos.length - 1 ? '1px solid #f0f0f0' : 'none'
                                }}
                              >
                                <Typography variant="body2">
                                  {alumno.nombre} {alumno.apellido}
                                </Typography>
                              </Box>
                            ))}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </Box>
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
                  const isHidden = element.style.display === 'none' || !element.style.display;
                  element.style.display = isHidden ? 'block' : 'none';
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
            <Box id="groups-content" sx={{ p: 2, pt: 0, display: 'none' }} >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                {result.champion.grupos.map((grupo, i) => {
                  const alumnos = grupo.alumnos || [];
                  return (<Box key={alumnos.map(x => x.nombre + ' ' + x.apellido).join(',')} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight={300}>
                        <b>{"  Grupo " + (i + 1)}</b> ({alumnos.length})
                      </Typography>
                      <Box sx={{ mb: 1, display: 'ruby', flexDirection: 'row' }}>
                        <Typography fontWeight={600} variant="body2" color="text.secondary" sx={{ mb: 0.5, paddingRight: 1 }}>
                          Tutores:
                        </Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ paddingRight: 1 }}>
                          {grupo.tutores.map(x => x.nombre + ' ' + x.apellido).join(', ')}
                        </Typography>
                      </Box>

                      <Box sx={{ mb: 1, display: 'ruby', flexDirection: 'row' }}>
                        <Typography fontWeight={600} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Alumnos:
                        </Typography>
                        {grupo.alumnos.map(x => {
                          const score = x.tutores.reduce((sum, _, idx) => sum + (grupo.tutores.map(x => x.id).includes(x.tutores[idx].id) ? (pesoRelativoTutores[idx] || 0) : 0), 0);
                          const maxScore = x.tutores.reduce((sum, _, idx) => sum + (pesoRelativoTutores[idx] || 0), 0);
                          let color = 'text.primary';
                          if (score / maxScore >= 0.75) color = 'success.main';
                          else if (score / maxScore >= 0.5) color = '#FFC107';
                          else if (score / maxScore >= 0.25) color = 'warning.dark';
                          else color = 'error.main';
                          return (<Box key={x.nombre + ' ' + x.apellido + x.email} display='ruby' flexDirection='row' sx={{ mb: 1, paddingRight: 1, borderRadius: 1, px: 1, py: 0.5, mr: 1, display: 'inline-flex', alignItems: 'center', backgroundColor: 'grey.100', ml: 1, }}>
                            <Typography variant="body2" sx={{ paddingRight: 0.5 }}>
                              {x.nombre + ' ' + x.apellido + ' '}
                            </Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.75rem', fontWeight: 600, color }}>
                              ({score} / {maxScore})
                            </Typography>
                          </Box>);
                        })}
                      </Box>
                    </Box>
                  </Box>
                  );
                })}
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
                  const isHidden = element.style.display === 'none' || !element.style.display;
                  element.style.display = isHidden ? 'block' : 'none';
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
              <Typography id="ranking-arrow" variant="h6" sx={{ transition: 'transform 0.2s', userSelect: 'none' }}>
                ▼
              </Typography>
            </Box>
            <Box id="ranking-content" sx={{ p: 2, pt: 0, display: 'none' }}>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 2fr', gap: 1, mb: 1, p: 1, bgcolor: 'grey.100', borderRadius: 0.5 }}>
                  <Typography variant="body2" fontWeight={600}>Nombre</Typography>
                  {/* <Typography variant="body2" fontWeight={600}>Grupos</Typography> */}
                  <Typography variant="body2" fontWeight={600}>% Satisfacción</Typography>
                  <Typography variant="body2" fontWeight={600}>Tutores</Typography>
                </Box>
                {result.alumnos.map((student, index) => {
                  const _student = student.tutores.reduce((p, t, idx) => {
                    const maxSatisfaction = student.tutores.filter(x => x).reduce((p, _x, i) => p + pesoRelativoTutores[i], 0);
                    const grupo = grupos.find(g => g.alumnos.find(x => x.id === student.id));
                    const tutor = student.tutores.find(x => x.id === t.id);
                    p.tutoresPedidos.push(t);
                    if (grupo && !p.grupos.includes(grupo)) {
                      p.grupos.push(grupo);
                    };
                    if (tutor && !p.tutores.includes(tutor)) {
                      p.tutores.push(tutor);
                      p.satisfaction = p.satisfaction + pesoRelativoTutores[idx] / maxSatisfaction;
                    };
                    return p;
                  }, { grupos: [] as Grupo[], tutores: [] as Tutor[], tutoresPedidos: [] as Tutor[], satisfaction: 0, nombre: student.nombre, apellido: student.apellido });


                  return <Box key={index} sx={{
                    display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 2fr', gap: 1,
                    p: 1, borderBottom: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'grey.50' }
                  }}>
                    <Typography variant="body2">{_student.nombre} {_student.apellido}</Typography>
                    {/* <Typography variant="body2">{_student.grupos.map((g, i) => `Grupo ${i + 1}`).join(",")}</Typography> */}
                    <Typography variant="body2" sx={{
                      color: _student.satisfaction >= 0.75 ? 'success.main' :
                        _student.satisfaction >= 0.50 ? '#FFC107' :
                          _student.satisfaction >= 0.25 ? 'warning.dark' :
                            'error.main',
                      fontWeight: 600
                    }}>
                      {(_student.satisfaction * 100).toFixed(1)}%
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {_student.tutoresPedidos.length > 0 ? _student.tutoresPedidos?.map((tutor, tutorIndex) => (
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
                            bgcolor: _student.tutores.includes(tutor) ? 'success.main' :'error.main',
                            //   tutor.estado === 'Missed' ? 'warning.main' : 'error.main'
                          }}
                        >
                          {tutor.nombre} {tutor.apellido}
                        </Typography>
                      )) : (
                        <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                          Sin preferencias
                        </Typography>
                      )}
                    </Box>
                  </Box>
                })}
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
                  const isHidden = element.style.display === 'none' || !element.style.display;
                  element.style.display = isHidden ? 'block' : 'none';
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
                display: 'none'
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

          {/* Genetic Algorithm Evolution */}
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
                const element = document.getElementById('evolution-content');
                if (element) {
                  const isHidden = element.style.display === 'none' || !element.style.display;
                  element.style.display = isHidden ? 'block' : 'none';
                }
                const arrow = document.getElementById('evolution-arrow');
                if (arrow) {
                  arrow.style.transform = arrow.style.transform === 'rotate(180deg)' ? 'rotate(0deg)' : 'rotate(180deg)';
                }
              }}
            >
              <Typography variant="h6">
                🧬 Evolución del Algoritmo Genético ({result?.geneticSummary?.length || 0} generaciones)
              </Typography>
              <Typography
                id="evolution-arrow"
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
              id="evolution-content"
              sx={{
                p: 2,
                pt: 0,
                display: 'none'
              }}
            >
              {result?.geneticSummary?.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  {/* Summary Stats */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', color: 'primary.contrastText', borderRadius: 1 }}>
                      <Typography variant="h6" fontWeight={600}>
                        {result?.geneticSummary?.length}
                      </Typography>
                      <Typography variant="caption">
                        Generaciones
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', color: 'success.contrastText', borderRadius: 1 }}>
                      <Typography variant="h6" fontWeight={600}>
                        {champion.fitness.toFixed(2)}
                      </Typography>
                      <Typography variant="caption">
                        Mejor Fitness
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', color: 'info.contrastText', borderRadius: 1 }}>
                      <Typography variant="h6" fontWeight={600}>
                        {result.endTime ? ((result.endTime - result.inititialTime) / 1000).toFixed(1) : '0.0'}s
                      </Typography>
                      <Typography variant="caption">
                        Duración
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', color: 'warning.contrastText', borderRadius: 1 }}>
                      <Typography variant="h6" fontWeight={600}>
                        {result.combinationsN}
                      </Typography>
                      <Typography variant="caption">
                        Combinaciones
                      </Typography>
                    </Box>
                  </Box>

                  {/* Simple Evolution Chart */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body1" fontWeight={600} sx={{ mb: 2 }}>
                      Evolución del Fitness por Generación
                    </Typography>
                    <Box sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      p: 2,
                      bgcolor: 'background.paper',
                      height: 500,
                    }}>
                      {(() => {
                        const perfectFitness = useSelector((state: RootState) => state.app.perfectFitness) as number;
                        const maxTeoricalFitness = useSelector((state: RootState) => state.app.maxTeoricalFitness) as number;
                        // Generate fitness data for visualization
                        const generations = result.geneticSummary;
                        const maxFitness = Math.max(result.champion.fitness, perfectFitness);
                        const minFitness = result.worst.fitness;
                        const range = maxFitness - minFitness || 1;
                        return (
                          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            {/* Chart area */}
                            <Box sx={{ flex: 1, minHeight: 0 }}>
                              <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 1000 300">
                                {/* Grid lines */}
                                {[0, 25, 50, 75, 100].map(y => (
                                  <line
                                    key={y}
                                    x1="60"
                                    y1={20 + (y * 260 / 100)}
                                    x2="980"
                                    y2={20 + (y * 260 / 100)}
                                    stroke="#e0e0e0"
                                    strokeWidth="1"
                                  />
                                ))}

                                {/* Max Teorical fitness line - only show if within range */}
                                {maxTeoricalFitness >= minFitness && maxTeoricalFitness <= maxFitness && (
                                  <line
                                    x1="60"
                                    y1={280 - ((maxTeoricalFitness - minFitness) / range * 260)}
                                    x2="980"
                                    y2={280 - ((maxTeoricalFitness - minFitness) / range * 260)}
                                    stroke="#2196f3"
                                    strokeWidth="2"
                                    strokeDasharray="12,6"
                                  />
                                )}

                                {/* Best fitness line */}
                                <polyline
                                  fill="none"
                                  stroke="#4caf50"
                                  strokeWidth="3"
                                  points={generations.map((gen, i) => {
                                    const x = 60 + (i * 920 / (generations.length - 1 || 1));
                                    const y = 280 - ((gen.bestFitness - minFitness) / range * 260);
                                    return `${x},${y}`;
                                  }).join(' ')}
                                />

                                {/* Average fitness line */}
                                <polyline
                                  fill="none"
                                  stroke="#ff9800"
                                  strokeWidth="3"
                                  points={generations.map((gen, i) => {
                                    const x = 60 + (i * 920 / (generations.length - 1 || 1));
                                    const y = 280 - ((gen.averageFitness - minFitness) / range * 260);
                                    return `${x},${y}`;
                                  }).join(' ')}
                                />

                                {/* Worst fitness line */}
                                <polyline
                                  fill="none"
                                  stroke="#f44336"
                                  strokeWidth="3"
                                  points={generations.map((gen, i) => {
                                    const x = 60 + (i * 920 / (generations.length - 1 || 1));
                                    const y = 280 - ((gen.worstFitness - minFitness) / range * 260);
                                    return `${x},${y}`;
                                  }).join(' ')}
                                />

                                {/* Y-axis labels */}
                                <text x="50" y="25" textAnchor="end" fontSize="12" fill="#666">{(maxFitness / perfectFitness * 100).toFixed(1)}%</text>
                                <text x="50" y="155" textAnchor="end" fontSize="12" fill="#666">{((minFitness + range / 2) / perfectFitness * 100).toFixed(1)}%</text>
                                <text x="50" y="285" textAnchor="end" fontSize="12" fill="#666">{(minFitness / perfectFitness * 100).toFixed(1)}%</text>

                                {/* X-axis labels */}
                                <text x="60" y="298" textAnchor="start" fontSize="12" fill="#666">0</text>
                                <text x="980" y="298" textAnchor="end" fontSize="12" fill="#666">{generations.length}</text>
                              </svg>
                            </Box>

                            {/* Legend */}
                            <Box sx={{
                              display: 'flex',
                              justifyContent: 'center',
                              gap: 3,
                              pt: 2,
                              mt: 'auto'
                            }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{ width: 20, height: 3, bgcolor: '#4caf50' }} />
                                <Typography variant="body2">Mejor</Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{ width: 20, height: 3, bgcolor: '#ff9800' }} />
                                <Typography variant="body2">Promedio</Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{ width: 20, height: 3, bgcolor: '#f44336' }} />
                                <Typography variant="body2">Peor</Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{ width: 20, height: 2, bgcolor: '#2196f3', borderTop: '2px dashed #2196f3' }} />
                                <Typography variant="body2">Perfecto</Typography>
                              </Box>
                            </Box>
                          </Box>
                        );
                      })()}
                    </Box>
                  </Box>

                  {/* Parameters Used */}
                  <Box>
                    <Typography variant="body1" fontWeight={600} sx={{ mb: 2 }}>
                      Parámetros Utilizados
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                      <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Semilla</Typography>
                        <Typography variant="body2" fontWeight={600}>{result.parameters.seed}</Typography>
                      </Box>
                      <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Población</Typography>
                        <Typography variant="body2" fontWeight={600}>{result.parameters.populationSize}</Typography>
                      </Box>
                      <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Mutación</Typography>
                        <Typography variant="body2" fontWeight={600}>{(result.parameters.mutationRate * 100).toFixed(1)}%</Typography>
                      </Box>
                      <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Crossover</Typography>
                        <Typography variant="body2" fontWeight={600}>{(result.parameters.crossoverRate * 100).toFixed(1)}%</Typography>
                      </Box>
                      <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Torneo</Typography>
                        <Typography variant="body2" fontWeight={600}>{result.parameters.tournamentSize}</Typography>
                      </Box>
                      <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Elitismo</Typography>
                        <Typography variant="body2" fontWeight={600}>{result.parameters.elitismCount}</Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              )}
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
        {sidebarOpen ? <ChevronLeftIcon /> : (
          <Box sx={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src="emprending-ico.png"
              alt="Emprending Logo"
              style={{ width: '28px', height: 'auto' }}
            />
          </Box>
        )}
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
