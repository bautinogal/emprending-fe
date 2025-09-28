import { useState, useEffect, type SyntheticEvent } from 'react'
import './App.css'

import * as React from 'react';
import { Box, Button, Divider, Drawer, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Tab, Tabs, Typography } from '@mui/material';
import { ChevronLeft as ChevronLeftIcon, Download as DownloadIcon, Groups as GroupsIcon, Menu as MenuIcon, School as SchoolIcon, UploadFile as UploadFileIcon } from '@mui/icons-material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';

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

const Parametros = ({ canRecalculate, tutoresData, alumnosData }: any) => {

  const onRecalculate = () => {
    console.log('Handle Recalculate triggered');
    console.log({
      dataStatus: {
        alumnosData,
        tutoresData
      },
      assignmentParams: {
        minCantidadGrupos,
        maxCantidadGrupos,
        maximosAlumnosPorGrupo,
        similarityThreshold,
        pesoRelativoTutores
      },
      geneticParams: {
        seed,
        geneticIterations,
        populationSize,
        mutationRate,
        crossoverRate,
        tournamentSize,
        elitismCount,
        complexityTotal: populationSize * geneticIterations
      }
    });

    if (alumnosData.length === 0 || tutoresData.length === 0) {
      alert('Por favor, carga los archivos CSV de tutores y alumnos antes de recalcular.');
      return;
    }
  }

  // Genetic Algorithm parameters
  const [seed, setSeed] = useState(42);
  const [geneticIterations, setGeneticIterations] = useState(100);
  const [populationSize, setPopulationSize] = useState(50);
  const [mutationRate, setMutationRate] = useState(0.1);
  const [crossoverRate, setCrossoverRate] = useState(0.7);
  const [tournamentSize, setTournamentSize] = useState(3);
  const [elitismCount, setElitismCount] = useState(2);

  // Parameters state
  const [minCantidadGrupos, setMinCantidadGrupos] = useState(3);
  const [maxCantidadGrupos, setMaxCantidadGrupos] = useState(7);
  const [maximosAlumnosPorGrupo, setMaximosAlumnosPorGrupo] = useState(10);
  const [pesoRelativoTutores, setPesoRelativoTutores] = useState([10, 5, 3, 2, 1]);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.8);

  const handlePesoChange = (index: number, value: string) => {
    setPesoRelativoTutores((prev: number[]) => {
      const newPesos = [...prev];
      newPesos[index] = Number(value);
      return newPesos;
    });
  };

  return <Box sx={{ p: 3, overflowY: 'auto', height: '100%' }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      <Typography variant="h5" fontWeight={600}>
        Parámetros de la Maratón
      </Typography>
      <Button
        variant="contained"
        onClick={onRecalculate}
        disabled={!canRecalculate}
        sx={{ bgcolor: 'primary.main' }}
      >
        Recalcular Grupos
      </Button>
    </Box>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 400 }}>
      <Box>
        <Typography variant="body1" sx={{ mb: 1 }}>
          Mínima Cantidad de Grupos
        </Typography>
        <input
          type="number"
          value={minCantidadGrupos}
          onChange={(e) => setMinCantidadGrupos(Number(e.target.value))}
          min="1"
          style={{
            padding: '8px 12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '16px',
            width: '100px'
          }}
        />
      </Box>
      <Box>
        <Typography variant="body1" sx={{ mb: 1 }}>
          Máxima Cantidad de Grupos
        </Typography>
        <input
          type="number"
          value={maxCantidadGrupos}
          onChange={(e) => setMaxCantidadGrupos(Number(e.target.value))}
          min={minCantidadGrupos}
          style={{
            padding: '8px 12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '16px',
            width: '100px'
          }}
        />
        {(tutoresData.length > 0 || alumnosData.length > 0) && maxCantidadGrupos > Math.min(tutoresData.length || Infinity, alumnosData.length || Infinity) && (
          <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
            ⚠️ Máximo {Math.min(tutoresData.length || Infinity, alumnosData.length || Infinity)} grupos
            (limitado por {tutoresData.length <= alumnosData.length ? 'tutores' : 'alumnos'}: {Math.min(tutoresData.length || Infinity, alumnosData.length || Infinity)})
          </Typography>
        )}
      </Box>
      <Box>
        <Typography variant="body1" sx={{ mb: 1 }}>
          Máximos Alumnos por Grupo
        </Typography>
        <input
          type="number"
          value={maximosAlumnosPorGrupo}
          onChange={(e) => setMaximosAlumnosPorGrupo(Number(e.target.value))}
          style={{
            padding: '8px 12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '16px',
            width: '100px'
          }}
        />
      </Box>
      <Box>
        <Typography variant="body1" sx={{ mb: 1 }}>
          Peso relativo tutores
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
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
      </Box>
      <Box>
        <Typography variant="body1" sx={{ mb: 1 }}>
          Sensibilidad de coincidencia de nombres: {(similarityThreshold * 100).toFixed(0)}%
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="caption">Estricto</Typography>
          <input
            type="range"
            min="0"
            max="100"
            value={similarityThreshold * 100}
            onChange={(e) => setSimilarityThreshold(Number(e.target.value) / 100)}
            style={{
              width: '300px',
              cursor: 'pointer'
            }}
          />
          <Typography variant="caption">Flexible</Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          0% = Solo coincidencias exactas | 100% = Acepta variaciones (acentos, abreviaciones)
        </Typography>
      </Box>
    </Box>

    {/* Genetic Algorithm Parameters */}
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
        Parámetros del Algoritmo Genético
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3, maxWidth: 800 }}>
        <Box>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Semilla (Seed): {seed}
          </Typography>
          <input
            type="number"
            value={seed}
            onChange={(e) => setSeed(Number(e.target.value))}
            style={{
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '16px',
              width: '150px'
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Para resultados reproducibles
          </Typography>
        </Box>

        <Box>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Iteraciones: {geneticIterations}
          </Typography>
          <input
            type="range"
            min="10"
            max="500"
            value={geneticIterations}
            onChange={(e) => setGeneticIterations(Number(e.target.value))}
            style={{ width: '200px', cursor: 'pointer' }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Más iteraciones = mejor solución pero más lento
          </Typography>
        </Box>

        <Box>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Tamaño de Población: {populationSize}
          </Typography>
          <input
            type="range"
            min="10"
            max="200"
            value={populationSize}
            onChange={(e) => setPopulationSize(Number(e.target.value))}
            style={{ width: '200px', cursor: 'pointer' }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Más población = más diversidad
          </Typography>
        </Box>

        <Box>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Tasa de Mutación: {(mutationRate * 100).toFixed(0)}%
          </Typography>
          <input
            type="range"
            min="1"
            max="30"
            value={mutationRate * 100}
            onChange={(e) => setMutationRate(Number(e.target.value) / 100)}
            style={{ width: '200px', cursor: 'pointer' }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            5-20% típico (previene convergencia prematura)
          </Typography>
        </Box>

        <Box>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Tasa de Cruce: {(crossoverRate * 100).toFixed(0)}%
          </Typography>
          <input
            type="range"
            min="50"
            max="95"
            value={crossoverRate * 100}
            onChange={(e) => setCrossoverRate(Number(e.target.value) / 100)}
            style={{ width: '200px', cursor: 'pointer' }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            60-90% típico (mezcla de soluciones)
          </Typography>
        </Box>

        <Box>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Tamaño del Torneo: {tournamentSize}
          </Typography>
          <input
            type="range"
            min="2"
            max="10"
            value={tournamentSize}
            onChange={(e) => setTournamentSize(Number(e.target.value))}
            style={{ width: '200px', cursor: 'pointer' }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            2-3 exploración, 4-5 explotación
          </Typography>
        </Box>

        <Box>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Elitismo: {elitismCount} individuos
          </Typography>
          <input
            type="range"
            min="0"
            max="10"
            value={elitismCount}
            onChange={(e) => setElitismCount(Number(e.target.value))}
            style={{ width: '200px', cursor: 'pointer' }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Mejores individuos que pasan sin cambios
          </Typography>
        </Box>

        <Box>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Complejidad Total: {(populationSize * geneticIterations).toLocaleString()}
          </Typography>
          <Typography variant="caption" color={populationSize * geneticIterations > 100000 ? 'warning.main' : 'text.secondary'} sx={{ display: 'block' }}>
            {populationSize * geneticIterations < 10000 ? 'Rápido' :
              populationSize * geneticIterations < 50000 ? 'Normal' :
                populationSize * geneticIterations < 100000 ? 'Lento' : 'Muy lento'}
          </Typography>
        </Box>
      </Box>
    </Box>
  </Box>;
};

const Maraton = () => {
  const tabs = ['Tutores', 'Alumnos', 'Parámetros', 'Resultados'];
  const [maratonTab, setMaratonTab] = useState('Tutores');

  const [alumnosFile, setAlumnosFile] = useState<File | null>(null);
  const [tutoresFile, setTutoresFile] = useState<File | null>(null);
  const [alumnosData, setAlumnosData] = useState<any[]>([]);
  const [tutoresData, setTutoresData] = useState<any[]>([]);
  const [alumnosColumns, setAlumnosColumns] = useState<GridColDef[]>([]);
  const [tutoresColumns, setTutoresColumns] = useState<GridColDef[]>([]);

  // Results state
  const [assignmentResults, setAssignmentResults] = useState<any>(null);

  const requiredAlumnosColumns = [
    'Fecha', 'Nombre', 'Apellido', 'Email', 'Rubro', 'Emprendimiento',
    'Descripción', 'Puntaje', 'Tutor1', 'Tutor2', 'Tutor3', 'Tutor4', 'Tutor5'
  ];

  const requiredTutoresColumns = [
    'Nombre', 'Apellido'
  ];

  // Shared function to calculate match score for a student (counts ALL tutor preferences in maxScore)
  const calculateMatchScore = (alumno: any, groupTutors: string[]) => {
    let score = 0;
    let maxScore = 0;

    // Check each tutor preference - count ALL preferences in maxScore (even non-existent tutors)
    for (let i = 1; i <= 5; i++) {
      const tutorPref = alumno[`Tutor${i}`];
      if (tutorPref && tutorPref.trim()) { // Count any non-empty preference
        const weight = pesoRelativoTutores[i - 1] || 0;
        maxScore += weight; // Count ALL tutor preferences regardless of validity

        // Only give score points if tutor exists AND is in the group
        let tutorExistsInDatabase = false;
        if (tutoresData && tutoresData.length > 0) {
          const validTutorNames = tutoresData.map(t => `${t.Nombre} ${t.Apellido}`);
          for (const validTutor of validTutorNames) {
            const similarity = calculateSimilarity(tutorPref, validTutor);
            const threshold = 1.0 - similarityThreshold;
            if (similarity >= threshold) {
              tutorExistsInDatabase = true;
              break;
            }
          }
        }

        // Only give credit if tutor exists in database AND is in the group
        if (tutorExistsInDatabase) {
          for (const groupTutor of groupTutors) {
            const similarity = calculateSimilarity(tutorPref, groupTutor);
            if (similarity >= (1.0 - similarityThreshold)) {
              score += weight;
              break;
            }
          }
        }
      }
    }

    return { score, maxScore };
  };

  // // Algorithm to create optimal groups
  // const createOptimalGroups = () => {
  //   if (alumnosData.length === 0 || tutoresData.length === 0) return;

  //   console.log('Starting group optimization...');
  //   //console.log(`Testing group counts from ${minCantidadGrupos} to ${maxCantidadGrupos}`);

  //   // Create tutor full names for matching
  //   const tutorFullNames = tutoresData.map(t => ({
  //     original: `${t.Nombre} ${t.Apellido}`,
  //     normalized: normalizeName(`${t.Nombre} ${t.Apellido}`),
  //     firstName: t.Nombre,
  //     lastName: t.Apellido
  //   }));

  //   // Calculate affinity score for each alumno-group combination
  //   const calculateAffinity = (alumno: any, groupTutors: string[]) => {
  //     let score = 0;

  //     // Check each tutor preference with weights
  //     for (let i = 1; i <= 5; i++) {
  //       const tutorPref = alumno[`Tutor${i}`];
  //       if (!tutorPref) continue;

  //       const weight = pesoRelativoTutores[i - 1] || 0;

  //       // First check if this tutor preference is valid (exists in database)
  //       let tutorExistsInDatabase = false;
  //       const validTutorNames = tutorFullNames.map(t => t.original);
  //       for (const validTutor of validTutorNames) {
  //         const similarity = calculateSimilarity(tutorPref, validTutor);
  //         const threshold = 1.0 - similarityThreshold;
  //         if (similarity >= threshold) {
  //           tutorExistsInDatabase = true;
  //           break;
  //         }
  //       }

  //       // Only give credit if tutor exists in database AND is in the group
  //       if (tutorExistsInDatabase) {
  //         // Check if this valid tutor is in the group
  //         let maxSimilarity = 0;

  //         for (const groupTutor of groupTutors) {
  //           const similarity = calculateSimilarity(tutorPref, groupTutor);

  //           // Special handling for abbreviations
  //           const prefParts = normalizeName(tutorPref).split(' ');
  //           const gtParts = normalizeName(groupTutor).split(' ');

  //           // Check if it's an abbreviation match (e.g., "r. hernandez" matches "roberto hernandez")
  //           if (prefParts.length >= 2 && gtParts.length >= 2) {
  //             const lastNameMatch = prefParts[prefParts.length - 1] === gtParts[gtParts.length - 1];
  //             const firstInitialMatch = prefParts[0].charAt(0) === gtParts[0].charAt(0);
  //             if (lastNameMatch && prefParts[0].length <= 2 && firstInitialMatch) {
  //               // Boost similarity for abbreviation matches
  //               maxSimilarity = Math.max(maxSimilarity, 0.95);
  //               continue;
  //             }
  //           }

  //           if (similarity > maxSimilarity) {
  //             maxSimilarity = similarity;
  //           }
  //         }

  //         // Give credit when tutor is in the group
  //         const threshold = 1.0 - similarityThreshold;
  //         if (maxSimilarity >= threshold) {
  //           score += weight;
  //         }
  //       }
  //     }

  //     return score;
  //   };

  //   // Function to validate tutors and collect warnings
  //   const validateTutorPreferences = () => {
  //     const warnings: string[] = [];
  //     const validTutorNames = tutorFullNames.map(t => t.original);

  //     alumnosData.forEach((alumno) => {
  //       for (let i = 1; i <= 5; i++) {
  //         const tutorPref = alumno[`Tutor${i}`];
  //         if (!tutorPref) continue;

  //         // Check if this tutor preference matches any available tutor
  //         let bestSimilarity = 0;
  //         let bestMatch = null;

  //         for (const validTutor of validTutorNames) {
  //           const similarity = calculateSimilarity(tutorPref, validTutor);
  //           if (similarity > bestSimilarity) {
  //             bestSimilarity = similarity;
  //             bestMatch = validTutor;
  //           }
  //         }

  //         // Show warnings for similarities below threshold
  //         const threshold = 1.0 - similarityThreshold;
  //         if (bestSimilarity < threshold) {
  //           if (bestSimilarity > 0.5) {
  //             // Close match but below threshold - might be a typo
  //             warnings.push(
  //               `"${alumno.Nombre} ${alumno.Apellido}" seleccionó "${tutorPref}" (Tutor${i}) - ¿querías decir "${bestMatch}"? (${(bestSimilarity * 100).toFixed(0)}% coincidencia)`
  //             );
  //           } else {
  //             // Very low similarity - likely non-existent tutor
  //             warnings.push(
  //               `"${alumno.Nombre} ${alumno.Apellido}" seleccionó "${tutorPref}" (Tutor${i}) que no coincide con ningún tutor disponible`
  //             );
  //           }
  //         }
  //         // Note: abbreviations with 95% similarity won't show warnings with 80% threshold
  //       }
  //     });

  //     return warnings;
  //   };

  //   // Calculate perfect score (if all students got all their preferred tutors)
  //   const calculatePerfectScore = () => {
  //     let perfectScore = 0;
  //     alumnosData.forEach((alumno) => {
  //       for (let i = 1; i <= 5; i++) {
  //         const tutorPref = alumno[`Tutor${i}`];
  //         if (tutorPref) {
  //           const weight = pesoRelativoTutores[i - 1] || 0;
  //           perfectScore += weight; // Assume perfect match (score = weight)
  //         }
  //       }
  //     });
  //     return perfectScore;
  //   };

  //   // Function to create and evaluate groups for a specific count
  //   const evaluateGroupConfiguration = (cantidadGrupos: number) => {
  //     const newGroups: any[] = [];

  //     // Initialize empty groups
  //     for (let i = 0; i < cantidadGrupos; i++) {
  //       newGroups.push({
  //         id: i + 1,
  //         name: `Grupo ${i + 1}`,
  //         tutores: [],
  //         alumnos: [],
  //         maxCapacity: maximosAlumnosPorGrupo
  //       });
  //     }

  //     // Distribute tutors ensuring each group gets at least one
  //     tutorFullNames.forEach((tutor, index) => {
  //       const groupIndex = index % cantidadGrupos; // Round-robin distribution
  //       newGroups[groupIndex].tutores.push(tutor.original);
  //     });

  //     // Create assignment tracking
  //     const assignments: any[] = [];
  //     const assignedAlumnos = new Set();

  //     // Sort alumnos by score (higher scores first)
  //     const alumnosWithScores = alumnosData.map(alumno => {
  //       const scores = newGroups.map(group => ({
  //         groupId: group.id,
  //         score: calculateAffinity(alumno, group.tutores)
  //       }));
  //       scores.sort((a, b) => b.score - a.score);

  //       return {
  //         alumno,
  //         preferredGroups: scores
  //       };
  //     });

  //     // Sort by puntaje (descending), then by fecha (ascending), then by preference score
  //     alumnosWithScores.sort((a, b) => {
  //       // First priority: Higher puntaje (better students first)
  //       const puntajeA = parseFloat(a.alumno.Puntaje) || 0;
  //       const puntajeB = parseFloat(b.alumno.Puntaje) || 0;
  //       if (puntajeA !== puntajeB) {
  //         return puntajeB - puntajeA; // Higher scores first
  //       }

  //       // Second priority: Earlier fecha (older applications first)
  //       const fechaA = new Date(a.alumno.Fecha || '9999-12-31');
  //       const fechaB = new Date(b.alumno.Fecha || '9999-12-31');
  //       if (fechaA.getTime() !== fechaB.getTime()) {
  //         return fechaA.getTime() - fechaB.getTime(); // Earlier dates first
  //       }

  //       // Third priority: Higher tutor preference score
  //       return b.preferredGroups[0].score - a.preferredGroups[0].score;
  //     });

  //     // Log the assignment order for debugging
  //     console.log('Assignment order for', cantidadGrupos, 'groups:');
  //     alumnosWithScores.slice(0, 5).forEach((item, index) => {
  //       const { alumno } = item;
  //       console.log(`${index + 1}. ${alumno.Nombre} ${alumno.Apellido} - Puntaje: ${alumno.Puntaje}, Fecha: ${alumno.Fecha}`);
  //     });
  //     if (alumnosWithScores.length > 5) {
  //       console.log(`... and ${alumnosWithScores.length - 5} more students`);
  //     }

  //     // Assign alumnos to groups
  //     let totalScore = 0;
  //     for (const { alumno, preferredGroups } of alumnosWithScores) {
  //       // Try to assign to preferred groups in order
  //       for (const { groupId, score } of preferredGroups) {
  //         const group = newGroups.find(g => g.id === groupId);
  //         if (group && group.alumnos.length < group.maxCapacity) {
  //           group.alumnos.push(alumno);
  //           assignedAlumnos.add(alumno.id);
  //           // Use calculateMatchScore to ensure consistent calculation with Satisfacción Promedio
  //           const { score: matchScore } = calculateMatchScore(alumno, group.tutores);
  //           totalScore += matchScore;

  //           assignments.push({
  //             alumnoName: `${alumno.Nombre} ${alumno.Apellido}`,
  //             groupId,
  //             groupName: group.name,
  //             affinityScore: score,
  //             matchedTutors: []
  //           });

  //           break;
  //         }
  //       }
  //     }

  //     const totalAssigned = assignedAlumnos.size;
  //     const totalAlumnos = alumnosData.length;

  //     return {
  //       cantidadGrupos,
  //       groups: newGroups,
  //       assignments,
  //       totalScore,
  //       statistics: {
  //         totalAlumnos,
  //         totalAssigned,
  //         unassigned: totalAlumnos - totalAssigned,
  //         avgGroupSize: (totalAssigned / cantidadGrupos).toFixed(1),
  //         groupsUsed: newGroups.filter(g => g.alumnos.length > 0).length
  //       }
  //     };
  //   };

  //   // Validate tutor preferences and collect warnings
  //   const tutorWarnings = validateTutorPreferences();
  //   if (tutorWarnings.length > 0) {
  //     console.warn('Tutor validation warnings:', tutorWarnings);
  //   }

  //   // Calculate the theoretical perfect score
  //   const perfectScore = calculatePerfectScore();
  //   console.log(`Perfect score (theoretical maximum): ${perfectScore.toFixed(1)}`);

  //   // Try all group counts and find the best one
  //   let bestConfiguration = null;
  //   let bestScore = -1;

  //   // Limit max groups to number of tutors AND number of alumnos (each group needs at least one tutor and one alumno)
  //   const maxPossibleGroups = Math.min(maxCantidadGrupos, tutoresData.length, alumnosData.length);
  //   const effectiveMinGroups = Math.min(minCantidadGrupos, maxPossibleGroups);

  //   console.log(`Limited to ${maxPossibleGroups} groups (max tutors: ${tutoresData.length}, max alumnos: ${alumnosData.length})`);

  //   for (let groupCount = effectiveMinGroups; groupCount <= maxPossibleGroups; groupCount++) {
  //     const configuration = evaluateGroupConfiguration(groupCount);

  //     // Prefer configurations that assign more students and have higher total scores
  //     const configScore = configuration.totalScore * 1000 + configuration.statistics.totalAssigned;

  //     console.log(`Groups: ${groupCount}, Score: ${configuration.totalScore.toFixed(2)}, Assigned: ${configuration.statistics.totalAssigned}/${configuration.statistics.totalAlumnos}`);

  //     if (configScore > bestScore) {
  //       bestScore = configScore;
  //       bestConfiguration = configuration;
  //     }
  //   }

  //   if (bestConfiguration) {
  //     setAssignmentResults({
  //       ...bestConfiguration,
  //       timestamp: new Date().toISOString(),
  //       selectedGroupCount: bestConfiguration.cantidadGrupos,
  //       tutorWarnings: tutorWarnings,
  //       perfectScore: perfectScore
  //     });

  //     console.log(`Optimal configuration: ${bestConfiguration.cantidadGrupos} groups with total score: ${bestConfiguration.totalScore.toFixed(2)}`);

  //     // Switch to results tab
  //     setMaratonTab('Resultados');
  //   }
  // };

  const parseCSV = (text: string, type: 'alumnos' | 'tutores'): { data: any[], columns: GridColDef[], error?: string } => {
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'alumnos' | 'tutores') => {
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
        const { data, columns, error } = parseCSV(text, type);

        if (error) {
          alert(`Error en el archivo CSV: ${error}`);
          event.target.value = ''; // Reset input
          return;
        }

        if (type === 'alumnos') {
          setAlumnosFile(file);
          setAlumnosData(data);
          setAlumnosColumns(columns);
        } else {
          setTutoresFile(file);
          setTutoresData(data);
          setTutoresColumns(columns);
        }
      };
      reader.readAsText(file);
    }
  };

  const downloadExampleCSV = (type: 'alumnos' | 'tutores') => {
    const filename = type === 'alumnos' ? 'alumnos.csv' : 'tutores.csv';
    const link = document.createElement('a');
    link.href = `/examples/${filename}`;
    link.download = `ejemplo_${filename}`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const Tutores = () => {
    return <Box sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>Gestión de Tutores ({tutoresData.length} registros)</Typography>
        {tutoresFile && (
          <Box sx={{ color: 'info.main', borderRadius: 1 }}>
            <Typography variant="body1">{tutoresFile.name}</Typography>
          </Box>
        )}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            component="label"
            variant="contained"
            startIcon={<UploadFileIcon />}
          >
            Subir CSV
            <input
              type="file"
              accept=".csv"
              onChange={(e) => handleFileUpload(e, 'tutores')}
              hidden
            />
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => downloadExampleCSV('tutores')}
          >
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
            initialState={{
              pagination: {
                paginationModel: { pageSize: 100 },
              },
            }}
          />
        </Box>
      )}
    </Box>
  };
  const Alumnos = () => {
    return <Box sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>Gestión de Alumnos ({alumnosData.length} registros)</Typography>
        {alumnosFile && (
          <Box sx={{ color: 'info.main', borderRadius: 1 }}>
            <Typography variant="body1">{alumnosFile.name}</Typography>
          </Box>
        )}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            component="label"
            variant="contained"
            startIcon={<UploadFileIcon />}
          >
            Subir CSV
            <input
              type="file"
              accept=".csv"
              onChange={(e) => handleFileUpload(e, 'alumnos')}
              hidden
            />
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => downloadExampleCSV('alumnos')}
          >
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
            initialState={{
              pagination: {
                paginationModel: { pageSize: 100 },
              },
            }}
          />
        </Box>
      )}
    </Box>;
  };
  const Resultados = () => {
    // Uses the shared calculateMatchScore function

    // Function to generate and download CSV
    const downloadResultsAsCSV = () => {
      if (!assignmentResults) return;

      // Create CSV content
      const csvRows = ['Grupo,Nombre_Alumno,Apellido_Alumno,Email,Emprendimiento,Coincidencia,Tutores_Asignados'];

      assignmentResults.groups.forEach((group: any) => {
        const tutoresString = group.tutores.join('; ');

        group.alumnos.forEach((alumno: any) => {
          const { score, maxScore } = calculateMatchScore(alumno, group.tutores);
          const row = [
            group.name,
            alumno.Nombre,
            alumno.Apellido,
            alumno.Email || '',
            alumno.Emprendimiento || '',
            `${score}/${maxScore}`,
            `"${tutoresString}"`
          ].join(',');
          csvRows.push(row);
        });
      });

      // Add unassigned students if any
      const unassignedCount = assignmentResults.statistics.unassigned;
      if (unassignedCount > 0) {
        csvRows.push('');
        csvRows.push('Sin Asignar,,,,,,');
        alumnosData.forEach((alumno: any) => {
          const isAssigned = assignmentResults.groups.some((g: any) =>
            g.alumnos.some((a: any) => a.id === alumno.id)
          );
          if (!isAssigned) {
            // Calculate max score for unassigned students
            let maxScore = 0;
            for (let i = 1; i <= 5; i++) {
              if (alumno[`Tutor${i}`]) {
                maxScore += pesoRelativoTutores[i - 1] || 0;
              }
            }

            const row = [
              'Sin Asignar',
              alumno.Nombre,
              alumno.Apellido,
              alumno.Email || '',
              alumno.Emprendimiento || '',
              `0/${maxScore}`,
              ''
            ].join(',');
            csvRows.push(row);
          }
        });
      }

      // Create blob and download
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

    if (!assignmentResults) {
      return <Box sx={{ p: 3 }}>
        <Typography variant="h5" fontWeight={600} sx={{ mb: 2 }}>
          Resultados de la Asignación
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Carga los archivos CSV de tutores y alumnos para ver los resultados de la asignación.
        </Typography>
      </Box>;
    }

    return <Box sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
            <Typography variant="caption" color="text.secondary">Grupos Óptimos</Typography>
            <Typography variant="h6" >{assignmentResults.selectedGroupCount || assignmentResults.cantidadGrupos}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Total Alumnos</Typography>
            <Typography variant="h6">{assignmentResults.statistics.totalAlumnos}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Asignados</Typography>
            <Typography variant="h6" color="success.main">{assignmentResults.statistics.totalAssigned}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Sin Asignar</Typography>
            <Typography variant="h6" color={assignmentResults.statistics.unassigned > 0 ? "warning.main" : "text.primary"}>
              {assignmentResults.statistics.unassigned}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Puntuación Total</Typography>
            <Typography variant="h6" color={(() => {
              const percentage = (assignmentResults.totalScore / assignmentResults.perfectScore) * 100;
              return percentage >= 70 ? 'success.main' : percentage >= 50 ? 'warning.main' : 'error.main';
            })()}>
              {((assignmentResults.totalScore / assignmentResults.perfectScore) * 100).toFixed(1)}%
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Satisfacción Promedio</Typography>
            <Typography variant="h6" color={(() => {
              // Calculate average satisfaction
              let totalSatisfaction = 0;
              let totalStudents = 0;
              assignmentResults.groups.forEach((group: any) => {
                group.alumnos.forEach((alumno: any) => {
                  const { score, maxScore } = calculateMatchScore(alumno, group.tutores);
                  const satisfaction = maxScore > 0 ? (score / maxScore) * 100 : 0;
                  totalSatisfaction += satisfaction;
                  totalStudents++;
                });
              });
              const avgSatisfaction = totalStudents > 0 ? totalSatisfaction / totalStudents : 0;
              return avgSatisfaction >= 70 ? 'success.main' : avgSatisfaction >= 50 ? 'warning.main' : 'error.main';
            })()}>
              {(() => {
                // Calculate and display average satisfaction
                let totalSatisfaction = 0;
                let totalStudents = 0;
                assignmentResults.groups.forEach((group: any) => {
                  group.alumnos.forEach((alumno: any) => {
                    const { score, maxScore } = calculateMatchScore(alumno, group.tutores);
                    const satisfaction = maxScore > 0 ? (score / maxScore) * 100 : 0;
                    totalSatisfaction += satisfaction;
                    totalStudents++;
                  });
                });
                const avgSatisfaction = totalStudents > 0 ? totalSatisfaction / totalStudents : 0;
                return avgSatisfaction.toFixed(1);
              })()}%
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Prom. Alumnos por Grupo</Typography>
            <Typography variant="h6">{assignmentResults.statistics.avgGroupSize}</Typography>
          </Box>
        </Box>
      </Box>

      {/* Groups Details */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {/* Tutor Warnings */}
        {assignmentResults.tutorWarnings && assignmentResults.tutorWarnings.length > 0 && (
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
                ⚠️ Advertencias de Tutores ({assignmentResults.tutorWarnings.length})
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
                {assignmentResults.tutorWarnings.map((warning: string, index: number) => (
                  <Typography key={index} variant="body2" sx={{ mb: 1, color: 'warning.dark' }}>
                    • {warning}
                  </Typography>
                ))}
              </Box>
              <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'warning.dark' }}>
                Estos tutores no fueron encontrados o tienen baja coincidencia. Verifica la ortografía en el archivo de alumnos.
              </Typography>
            </Box>
          </Box>
        )}
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
              👥 Grupos Formados ({assignmentResults.groups.length})
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
              {assignmentResults.groups.map((group: any) => (
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
                          const { score, maxScore } = calculateMatchScore(alumno, group.tutores);
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
                                {alumno.Nombre} {alumno.Apellido}
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
              🏆 Ranking de Satisfacción ({assignmentResults.groups.reduce((total: number, group: any) => total + group.alumnos.length, 0)} estudiantes)
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

                const tutorFullNames = tutoresData.map(t => ({
                  original: `${t.Nombre} ${t.Apellido}`,
                  normalized: normalizeName(`${t.Nombre} ${t.Apellido}`),
                  firstName: t.Nombre,
                  lastName: t.Apellido
                }));
                const validTutorNames = tutorFullNames.map(t => t.original);


                assignmentResults.groups.forEach((group: any) => {
                  group.alumnos.forEach((alumno: any) => {
                    const { score, maxScore } = calculateMatchScore(alumno, group.tutores);
                    const satisfaction = maxScore > 0 ? (score / maxScore) * 100 : 0;

                    // Calculate tutor matches with status
                    const tutorResults: Array<{ name: string, status: 'matched' | 'not_matched' | 'not_found' }> = [];

                    for (let i = 1; i <= 5; i++) {
                      const tutorPref = alumno[`Tutor${i}`];
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
                      name: `${alumno.Nombre} ${alumno.Apellido}`,
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
                const validTutorNames = tutoresData.map(t => `${t.Nombre} ${t.Apellido}`);

                validTutorNames.forEach(tutorName => {
                  let selectedCount = 0;
                  let matchedCount = 0;

                  assignmentResults.groups.forEach((group: any) => {
                    group.alumnos.forEach((alumno: any) => {
                      for (let i = 1; i <= 5; i++) {
                        const tutorPref = alumno[`Tutor${i}`];
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
    </Box>;
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
      <CustomTabPanel value={maratonTab} index={"Parámetros"} children={
        <Parametros
          canRecalculate={alumnosData.length > 0 && tutoresData.length > 0}
          tutoresData={tutoresData}
          alumnosData={alumnosData}
        />
      } />
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
  </Box>);
}
