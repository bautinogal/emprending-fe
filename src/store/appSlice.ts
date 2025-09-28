import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';

interface Warnings {
  others: string[];
  unassignedAlumnos: string[];
  tutoresNotFound: { alumno: string; tutor: string, closest: string, score: number }[];
}

interface Parameters {
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
  maximosAlumnosPorGrupo: number;
  similarityThreshold: number;
  pesoRelativoTutores: number[];
}

interface AlumnoData { nombre: string, apellido: string, email: string, value: number, tutores: string[] }

interface TutorData { nombre: string, apellido: string, email: string }

interface AppState {
  // Data states
  alumnosData: AlumnoData[];
  tutoresData: TutorData[];
  alumnosColumns: any[];
  tutoresColumns: any[];
  alumnosFile: File | null;
  tutoresFile: File | null;

  // UI states
  selectedSidebarTab: string;
  sidebarOpen: boolean;

  // Algorithm parameters
  parameters: Parameters;

  // Results
  running: boolean;
  runningPercentage: number;
  result: any | null;
  optimizationError: string | null;
}

const initialState: AppState = {
  alumnosData: [],
  tutoresData: [],
  alumnosColumns: [],
  tutoresColumns: [],
  alumnosFile: null,
  tutoresFile: null,

  selectedSidebarTab: 'Tutores',
  sidebarOpen: true,

  parameters: {
    seed: 42,
    geneticIterations: 100,
    populationSize: 50,
    mutationRate: 0.1,
    crossoverRate: 0.5,
    tournamentSize: 5,
    elitismCount: 2,
    minCantidadGrupos: 1,
    maxCantidadGrupos: 10,
    maximosAlumnosPorGrupo: 30,
    similarityThreshold: 0.8,
    pesoRelativoTutores: [10, 8, 5, 3, 1],
  },

  running: false,
  runningPercentage: 0,
  result: null,
  optimizationError: null,
};

const mulberry32 = (seed: number) => {
  return function () {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
};

const hashArray = (arr: number[]): string => {
  return arr.join(',');
};

const shuffleArray = <T>(array: T[], seed: number): T[] => {
  const random = mulberry32(seed);
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
};

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
  const levenshteinDistance = (str1: string, str2: string): number => {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,    // deletion
            dp[i][j - 1] + 1,    // insertion
            dp[i - 1][j - 1] + 1 // substitution
          );
        }
      }
    }
    return dp[m][n];
  };

  if (!str1 || !str2) return 0;

  const normalizedStr1 = normalizeName(str1);
  const normalizedStr2 = normalizeName(str2);

  // Exact match after normalization
  if (normalizedStr1 === normalizedStr2) return 1.0;

  // Check for abbreviation match first (higher priority than Levenshtein)
  const parts1 = normalizedStr1.split(' ');
  const parts2 = normalizedStr2.split(' ');
  if (parts1.length >= 2 && parts2.length >= 2) {
    const lastNameMatch = parts1[parts1.length - 1] === parts2[parts2.length - 1];
    const firstInitialMatch = parts1[0].charAt(0) === parts2[0].charAt(0);
    if (lastNameMatch && parts1[0].length <= 2 && firstInitialMatch) {
      return 0.95; // High similarity for abbreviations
    }
  }

  // Calculate Levenshtein similarity for other cases
  const maxLen = Math.max(normalizedStr1.length, normalizedStr2.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(normalizedStr1, normalizedStr2);
  const similarity = 1 - (distance / maxLen);

  return Math.max(0, similarity);
};

export const optimizeGroups = createAsyncThunk(
  'app/optimizeGroups',
  async (_, { getState, rejectWithValue }) => {

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
      fitness: number | null;
    };

    interface Generation {
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
    };

    interface History {

      inititialTime: number;
      endTime: number | null;

      individuals: { [key: string]: Individual };
      populationZero: string[];
      generations: Generation[];
    };

    const prepareData = (alumnosData: AlumnoData[], tutoresData: TutorData[], parameters: Parameters): { alumnos: Alumno[], tutores: Tutor[], warnings: Warnings } => {
      const warnings: Warnings = { others: [], unassignedAlumnos: [], tutoresNotFound: [] };
      const tutores = tutoresData.map((tutor, i) => ({ ...tutor, id: i }))
      const alumnos = alumnosData.map((alumno, i) => {
        const alumnoTutores: Tutor[] = alumno.tutores.map((x) => {

          const matchRanking = tutores
            .map(tutor => ({ ...tutor, score: calculateSimilarity(x, `${tutor.nombre} ${tutor.apellido}`) }))
            .sort((a, b) => b.score - a.score);

          const bestMatch = matchRanking[0];
          if (bestMatch && bestMatch.score >= parameters.similarityThreshold) {
            return bestMatch;
          } else {
            warnings.tutoresNotFound.push({
              alumno: `${alumno.nombre} ${alumno.apellido}`,
              tutor: x,
              closest: `${bestMatch.nombre} ${bestMatch.apellido}`,
              score: bestMatch.score
            })
            return { score: 0, id: -1, nombre: "Nombre", apellido: "Apellido", email: "notfound" }
          }

        });
        return { ...alumno, tutores: alumnoTutores, id: i }
      });

      return { alumnos, tutores, warnings };
    };

    const getMaxScores = (alumnos: Alumno[], parameters: Parameters): { perfectFitness: number, maxTeoricalFitness: number } => {
      const perfectFitness = alumnos.reduce((p, x) =>
        p + x.tutores
          .reduce((pr, _y, i) => pr + x.value * parameters.pesoRelativoTutores[i], 0),
        0);

      const maxTeoricalFitness = alumnos.reduce((p, x) =>
        p + x.tutores
          .filter(y => y.id != -1)
          .reduce((pr, _y, i) => pr + x.value * parameters.pesoRelativoTutores[i], 0),
        0);

      return { perfectFitness, maxTeoricalFitness };
    };

    const calculateGrupos = (individual: number[], alumnos: Alumno[], parameters: Parameters): Grupo[] => {
      const groups: Grupo[] = [];
      // Implement group calculation logic here
      return groups;
    };

    const calculateFitness = (grupos: Grupo[], alumnos: Alumno[], parameters: Parameters): number => {
      const fitness = grupos.reduce((p, grupo) => {
        const idTutoresGrupo = grupo.tutores.map(t => t.id);
        return p + grupo.alumnos.reduce((pr, alumno) => {
          const idTutoresPreferidos = alumno.tutores.map(t => t.id);
          return idTutoresPreferidos.reduce((pre, tutorPref, i) => {
            if (idTutoresGrupo.includes(tutorPref)) {
              pre += alumno.value * parameters.pesoRelativoTutores[i];
            }
            return pre;
          }, 0);
        }, 0)
      }, 0)
      return fitness;
    };

    const initHistory = (alumnos: Alumno[], tutores: Tutor[], parameters: Parameters, rng: Function): History => {

      const alumnosIds = alumnos.map(x => x.id);
      const individuals: { [key: string]: Individual } = {};

      for (let i = 0; i < parameters.populationSize; i++) {
        let individual = shuffleArray(alumnosIds, rng());
        let hash = hashArray(individual);
        while (individuals[hash]) {
          individual = shuffleArray(alumnosIds, rng());
          hash = hashArray(individual);
        };
        const grupos = calculateGrupos(individual, alumnos, parameters);
        const fitness = calculateFitness(grupos, alumnos, parameters);

        individuals[hash] = {
          parentA: null,
          parentB: null,
          generation: 0,
          extintGeneration: null,
          alumnosIds: individual,
          grupos,
          fitness,
        };
      };

      return {
        inititialTime: Date.now(),
        endTime: null,
        individuals,
        populationZero: Object.keys(individuals),
        generations: [],
      };
    };

    const iterate = (history: History, alumnos: any[], parameters: Parameters) => {
      return history;
    };

    try {
      const state = getState() as { app: AppState };
      const { alumnosData, tutoresData, parameters } = state.app;
      const { alumnos, tutores, warnings } = prepareData(alumnosData, tutoresData, parameters);
      const { perfectFitness, maxTeoricalFitness } = getMaxScores(alumnos, parameters);

      let currentBestScore = 0;
      const rng = mulberry32(parameters.seed);
      let history = initHistory(alumnos, tutores, parameters, rng);
      let percentageCompleted = 0;

      for (let i = 0; i < parameters.geneticIterations && currentBestScore < perfectFitness; i++) {
        iterate(history, alumnos, parameters);
        percentageCompleted = (i + 1) / parameters.geneticIterations;
      }

      history.endTime = Date.now();

      return {
        warnings,
        grupos: history.individuals[history.populationZero[0]].grupos,
        statistics: {
          parameters,
          elapsedTimeMs: history.endTime - history.inititialTime,
          totalAlumnos: alumnos.length,
          totalAssigned: alumnos.length - warnings.unassignedAlumnos.length,
          unassigned: warnings.unassignedAlumnos.length,
          totalScore: currentBestScore,
          perfectFitness,
          maxTeoricalFitness,
        }
      };

    } catch (error) {
      console.error('Error optimizing groups:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Optimization failed');
    }
  }
);

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    // UI actions
    setSidebarTab: (state, action: PayloadAction<string>) => {
      state.selectedSidebarTab = action.payload;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },

    // Data actions
    setAlumnosData: (state, action: PayloadAction<{ data: any[], columns: any[], file: File }>) => {
      state.alumnosData = action.payload.data;
      state.alumnosColumns = action.payload.columns;
      state.alumnosFile = action.payload.file;
    },
    setTutoresData: (state, action: PayloadAction<{ data: any[], columns: any[], file: File }>) => {
      state.tutoresData = action.payload.data;
      state.tutoresColumns = action.payload.columns;
      state.tutoresFile = action.payload.file;
    },

    // Parameter actions
    setParameters: (state, action: PayloadAction<Partial<Parameters>>) => {
      state.parameters = { ...state.parameters, ...action.payload };
    },

    // Clear actions
    clearOptimizationError: (state) => {
      state.optimizationError = null;
    }

  },
  extraReducers: (builder) => {
    builder
      .addCase(optimizeGroups.pending, (state) => {
        state.running = true;
        state.runningPercentage = 0;
        state.optimizationError = null;
      })
      .addCase(optimizeGroups.fulfilled, (state, action) => {
        state.running = false;
        state.runningPercentage = 1;
        state.result = action.payload;
      })
      .addCase(optimizeGroups.rejected, (state, action) => {
        state.running = false;
        state.optimizationError = action.payload as string;
      });
  },
});

export const {
  setAlumnosData,
  setTutoresData,
  setSidebarTab,
  setSidebarOpen,
  clearOptimizationError,
} = appSlice.actions;

export default appSlice.reducer;