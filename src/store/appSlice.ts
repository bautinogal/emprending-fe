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
  minAlumnosPorGrupo: number;
  maxAlumnosPorGrupo: number;
  minTutoresPorGrupo: number;
  maxTutoresPorGrupo: number;
  similarityThreshold: number;
  pesoRelativoTutores: number[];
}

interface Result {
  warnings: Warnings;
  grupos: any[];
  statistics: {
    parameters: Parameters;
    elapsedTimeMs: number;
    totalAlumnos: number;
    totalAssigned: number;
    unassigned: number;
    totalScore: number;
    perfectFitness: number;
    maxTeoricalFitness: number;
  }
}

interface AlumnoData { nombre: string, apellido: string, email: string, value: number, tutores: string[] }

interface TutorData { nombre: string, apellido: string, email: string }

interface AppState {
  // Data states
  alumnosData: AlumnoData[];
  tutoresData: TutorData[];
  alumnosColumns: any[];
  tutoresColumns: any[];
  alumnosFileName: string | null;
  tutoresFileName: string | null;

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
  alumnosFileName: null,
  tutoresFileName: null,

  selectedSidebarTab: 'Tutores',
  sidebarOpen: true,

  parameters: {
    seed: 42,
    geneticIterations: 5,
    populationSize: 10,
    mutationRate: 0.1,
    crossoverRate: 0.5,
    tournamentSize: 5,
    elitismCount: 2,

    minCantidadGrupos: 1,
    maxCantidadGrupos: 10,
    minAlumnosPorGrupo: 1,
    maxAlumnosPorGrupo: 10,
    minTutoresPorGrupo: 1,
    maxTutoresPorGrupo: 5,
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
  // const parts1 = normalizedStr1.split(' ');
  // const parts2 = normalizedStr2.split(' ');
  // if (parts1.length >= 2 && parts2.length >= 2) {
  //   const lastNameMatch = parts1[parts1.length - 1] === parts2[parts2.length - 1];
  //   const firstInitialMatch = parts1[0].charAt(0) === parts2[0].charAt(0);
  //   if (lastNameMatch && parts1[0].length <= 2 && firstInitialMatch) {
  //     return 0.95; // High similarity for abbreviations
  //   }
  // }

  // Calculate Levenshtein similarity for other cases
  const maxLen = Math.max(normalizedStr1.length, normalizedStr2.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(normalizedStr1, normalizedStr2);
  const similarity = 1 - (distance / maxLen);

  return Math.max(0, similarity);
};

// Import the worker using Vite's worker syntax
import OptimizerWorker from '../optimizer.worker.ts?worker';

export const optimizeGroups = createAsyncThunk(
  'app/optimizeGroups',
  async (payload, { getState, rejectWithValue }) => {
    console.log("optimizeGroups")
      return new Promise((resolve, reject) => {
        const worker = new OptimizerWorker();

        worker.onmessage = (e) => {
          console.log("onmessage:", e.data);

          if (e.data.type === "error") {
            reject(new Error(e.data.error));
          } else {
            resolve(e.data);
          }
          worker.terminate(); // Clean up the worker
        };
        worker.onerror = (e) => {
          console.log("onerror:", e);
          reject(new Error('Worker failed to load or execute'));
          worker.terminate();
        };
        worker.postMessage(getState());
      });
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
    setFile: (state, action: PayloadAction<{ type: string, fileName: string, data: any[], columns: any[] }>) => {
      console.log('Setting file data:', action.payload);
      if (action.payload.type === 'alumnos') {
        state.alumnosData = action.payload.data;
        state.alumnosColumns = action.payload.columns;
        state.alumnosFileName = action.payload.fileName;
      } else if (action.payload.type === 'tutores') {
        state.tutoresData = action.payload.data;
        state.tutoresColumns = action.payload.columns;
        state.tutoresFileName = action.payload.fileName;
      }
      console.log('Finished Setting file data:', action.payload);
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
  setFile,
  setSidebarTab,
  setSidebarOpen,
  setParameters,
  clearOptimizationError,
} = appSlice.actions;

export default appSlice.reducer;