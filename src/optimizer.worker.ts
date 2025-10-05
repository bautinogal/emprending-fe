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

interface Slot { alumnosSlots: number, tutoresSlots: number }

interface Individual {
    parentA: string | null;
    parentB: string | null;
    generation: number;
    extintGeneration: number | null;

    alumnosIds: number[];
    tutoresIds: number[];
    slots: Slot[];

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

// Result interface is used for typing in the main app
// interface Result {
//     warnings: Warnings;
//     history: History;
//     parameters: OptimizationParameters
// }

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
    parameters: OptimizationParameters;

    // Results
    running: boolean;
    runningPercentage: number;
    result: any | null;
    optimizationError: string | null;
}

const lerp = (start: number, end: number, amount: number): number => {
    return start * (1 - amount) + end * amount;
}

const mulberry32 = (seed: number) => {
    return function () {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        let res = ((t ^ t >>> 14) >>> 0) / 4294967296;
        return res;
    };
};

const hashArray = (arr: number[] | [number[], number[], number[]]): string => {
    return arr.flat().join(',');
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

console.log('Worker script loaded successfully!');

self.onmessage = (e) => {


    console.log('Worker received message from main thread:', !!e.data);

    const prepareData = (alumnosData: AlumnoData[], tutoresData: TutorData[], parameters: OptimizationParameters): { alumnos: Alumno[], tutores: Tutor[], warnings: Warnings } => {
        const warnings: Warnings = { others: [], unassignedAlumnos: [], tutoresNotFound: [] };
        const tutores = tutoresData.map((tutor, i) => ({
            ...Object.entries(tutor).reduce((p: any, [k, v]) => {
                p[k.toLowerCase()] = v;
                return p;
            }, {}), id: i
        }));

        const alumnos = alumnosData.map((alumno, i) => {
            alumno = Object.entries(alumno).reduce((p: any, [k, v]) => {
                if (k.toLowerCase().includes("tutor") && v !== "") {
                    p["tutores"] = (p["tutores"] || []);
                    p["tutores"].push(v);
                } else if (k.toLowerCase().includes("puntaje")) {
                    p.value = v;
                } else if (v !== "") {
                    p[k.toLowerCase()] = v;
                }
                return p;
            }, {});

            const alumnoTutores: Tutor[] = (alumno?.tutores || []).map((x) => {

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

    const getMaxScores = (alumnos: Alumno[], parameters: OptimizationParameters): { perfectFitness: number, maxTeoricalFitness: number } => {
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

    const calculateFitness = (grupos: Grupo[], _alumnos: Alumno[], parameters: OptimizationParameters): number => {

        const curvedValue = (() => {
            const n = parameters.inequalityAversion + 1;
            const a = 0.5 * n - 0.5;
            const f = (x: number) => (1 + a) * (1 - Math.pow((1 - x), n)) - a;
            return (x: number, maxValue: number): number => 0 + (maxValue - 0) * f(x);
        })();

        let fitness = 0;

        grupos.forEach(grupo => {
            // Calculate positive fitness from matches
            const idTutoresGrupo = grupo.tutores.map(t => t.id);
            fitness += grupo.alumnos.reduce((pr, alumno) => {
                const idTutoresPreferidos = alumno.tutores.map(t => t.id);
                const maxAlumnoScore = idTutoresPreferidos.reduce((p, x, i) => p + alumno.value * parameters.pesoRelativoTutores[i], 0);
                const linearScore = idTutoresPreferidos.reduce((pre, tutorPref, i) => {
                    if (idTutoresGrupo.includes(tutorPref)) {
                        pre = pre + alumno.value * parameters.pesoRelativoTutores[i];
                    }
                    return pre;
                }, 0);

                const curvedScore = curvedValue(linearScore / maxAlumnoScore, maxAlumnoScore);
                return pr + curvedScore;

            }, 0);
        });

        // Return fitness minus penalties (penalties reduce fitness)
        return Math.max(0, fitness);
    };

    const getSlots = (parameters: OptimizationParameters, alumnos: Alumno[], tutores: Tutor[], rnd: number): Slot[] => {

        const generateConstrainedArray = (seed: number, minLength: number, maxLength: number, minValue: number, maxValue: number): number[] => {
            const rng = mulberry32(seed);

            // Determine array length within constraints
            const length = Math.floor(rng() * (maxLength - minLength + 1)) + minLength;

            // Generate random values for each slot
            const array = new Array(length).fill(0).map(() => {
                return Math.floor(rng() * (maxValue - minValue + 1)) + minValue;
            });

            return array;
        };
        

        // const minGroups = Math.max(parameters.minCantidadGrupos, Math.ceil(tutores.length / parameters.maxTutoresPorGrupo), Math.ceil(alumnos.length / parameters.maxAlumnosPorGrupo));
        // const maxGroups = Math.min(parameters.maxCantidadGrupos, Math.floor(tutores.length / parameters.minTutoresPorGrupo), Math.floor(alumnos.length / parameters.minAlumnosPorGrupo));
        let minGroups = Math.max(parameters.minCantidadGrupos);
        let maxGroups = Math.min(
            parameters.maxCantidadGrupos,
            Math.floor(tutores.length / parameters.minTutoresPorGrupo),
            Math.floor(alumnos.length / parameters.minAlumnosPorGrupo)
        );

        if (maxGroups < minGroups) throw new Error("Restricciones incompatibles!");

        const rng = mulberry32(rnd);
        const rnda = rng();
        const rndb = rng();
        const a = Math.round(lerp(parameters.minTutoresPorGrupo, parameters.maxTutoresPorGrupo, rnda));
        const b =  Math.round(lerp(parameters.minTutoresPorGrupo, parameters.maxTutoresPorGrupo, rndb));
        const minTutoresPorGrupo = Math.min(a,b);
        const maxTutoresPorGrupo = Math.max(a,b);
        const tutoresSlots = generateConstrainedArray(rnd, minGroups, maxGroups, minTutoresPorGrupo, maxTutoresPorGrupo);

        return tutoresSlots.map(a => ({ alumnosSlots: parameters.maxAlumnosPorGrupo, tutoresSlots: a }));
    };

    const calculateGrupos = (individual: [number[], number[], Slot[]], alumnos: Alumno[], tutores: Tutor[], parameters: OptimizationParameters): Grupo[] => {

        // const getGroups = (groupsN: number): { grupos: Grupo[], fitness: number } => {

        //     interface Slot { alumnosSlots: number, tutoresSlots: number }

        //     const alumnoFitness = (alumno: Alumno, grupo: Grupo): number => {
        //         const idTutoresGrupo = grupo.tutores.map(x => x.id);
        //         const idTutoresPreferidos = alumno.tutores.map(t => t.id);
        //         return idTutoresPreferidos.reduce((pre, tutorPref, i) => {
        //             if (idTutoresGrupo.includes(tutorPref)) {
        //                 pre = pre + alumno.value * parameters.pesoRelativoTutores[i];
        //             }
        //             return pre;
        //         }, 0);
        //     };

        //     const getBestAvailableGroup = (alumno: Alumno, grupos: Grupo[], slots: Slot[]): { currentPotentialGroupPos: number, updatedPotentialGroup: Grupo | null } => {

        //         const getPotentialGroup = (grupo: Grupo, slot: Slot): Grupo => {
        //             const tutoresOcupadosIds = grupos
        //                 .reduce((p, g) =>
        //                     p.concat(g.tutores.map(t => t.id)), [] as number[])

        //             const newTutores = alumno.tutores
        //                 .filter(t => !tutoresOcupadosIds.includes(t.id))
        //                 .slice(0, slot.tutoresSlots - grupo.tutores.length);

        //             return {
        //                 alumnos: [...grupo.alumnos, alumno],
        //                 tutores: [...grupo.tutores, ...newTutores]
        //             }
        //         };

        //         let currentPotentialGroupPos = -1;
        //         let bestFitness = -1;
        //         let updatedPotentialGroup = null;

        //         for (let i = 0; i < grupos.length; i++) {
        //             if (grupos[i].alumnos.length < slots[i].alumnosSlots) {
        //                 const potentialGroup = getPotentialGroup(grupos[i], slots[i]);
        //                 const grupoFitness = alumnoFitness(alumno, potentialGroup);
        //                 if (grupoFitness > bestFitness) {
        //                     bestFitness = grupoFitness;
        //                     updatedPotentialGroup = potentialGroup;
        //                 }
        //             }
        //         }
        //         console.log({ currentPotentialGroupPos, updatedPotentialGroup })
        //         return { currentPotentialGroupPos, updatedPotentialGroup };
        //     };

        //     const getNewGroup = (alumno: Alumno, grupos: Grupo[], slots: Slot[]): Grupo => {
        //         const slot = slots[grupos.length];
        //         const usedTutoresIds = grupos.map(x => x.tutores.map(y => y.id)).flat();

        //         const tutoresGrupo: Tutor[] = alumno.tutores.reduce((p, t) => {
        //             if (!usedTutoresIds.includes(t.id) && slot.tutoresSlots > p.length) {
        //                 p.push(t);
        //             }
        //             return p;
        //         }, [] as Tutor[]);

        //         return { alumnos: [alumno], tutores: tutoresGrupo };
        //     };

        //     const slots: Slot[] = [];
        //     for (let i = 0; i < groupsN; i++) {
        //         let alumnosSlots = Math.floor(alumnos.length / groupsN + (alumnos.length % groupsN > i ? 1 : 0));
        //         let tutoresSlots = Math.floor(tutores.length / groupsN + (tutores.length % groupsN > i ? 1 : 0));
        //         slots.push({ alumnosSlots, tutoresSlots })
        //     }

        //     const grupos = individual.reduce((grupos, alumnoId) => {
        //         const alumno = alumnos.find(a => a.id === alumnoId) as Alumno;
        //         let { currentPotentialGroupPos, updatedPotentialGroup } = getBestAvailableGroup(alumno, grupos, slots);

        //         const bestNewGroup = grupos.length < groupsN ? getNewGroup(alumno, grupos, slots) : null;

        //         if (!updatedPotentialGroup && bestNewGroup) grupos.push(bestNewGroup as Grupo);
        //         else if (!bestNewGroup && updatedPotentialGroup) grupos[currentPotentialGroupPos] = updatedPotentialGroup;
        //         else if (bestNewGroup && updatedPotentialGroup)
        //             alumnoFitness(alumno, bestNewGroup) > alumnoFitness(alumno, updatedPotentialGroup) ?
        //                 grupos.push(bestNewGroup as Grupo) : (grupos[currentPotentialGroupPos] = updatedPotentialGroup);
        //         else throw "Something went wrong!";

        //         return grupos;
        //     }, [] as Grupo[]);

        //     const fitness = calculateFitness(grupos, alumnos, parameters);

        //     return { grupos, fitness }
        // };

        const getGroupsDummy = (individual: [number[], number[], Slot[]], alumnos: Alumno[], tutores: Tutor[], parameters: OptimizationParameters): Grupo[] => {

            const [alumnosIds, _tutoresIds, slots] = individual;

            const alumnoFitness = (alumno: Alumno, grupo: Grupo): number => {
                const idTutoresGrupo = grupo.tutores.map(x => x.id);
                const idTutoresPreferidos = alumno.tutores.map(t => t.id);
                return idTutoresPreferidos.reduce((pre, tutorPref, i) => {
                    if (idTutoresGrupo.includes(tutorPref)) {
                        pre = pre + alumno.value * parameters.pesoRelativoTutores[i];
                    }
                    return pre;
                }, 0);
            };

            const gruposInicialesTutores = tutores.reduce((p, t) => {
                let grupo = p.find((g, i) => g.tutores.length < slots[i].tutoresSlots);
                if (grupo) {
                    grupo?.tutores?.push(t);
                } else if (p.length < slots.length) {
                    p.push({ alumnos: [], tutores: [t] })
                }
                return p;
            }, [] as Grupo[])

            const grupos = alumnosIds.filter(x => x).reduce((grupos, alumnoId) => {
                if (alumnoId === -1) {
                    console.log({ grupos, alumnoId, individual, alumnos, tutores, parameters })
                    throw Error("AlumnoId is -1!")
                }
                const alumno = alumnos.find(x => x.id === alumnoId);

                const remainingTutores = alumno?.tutores
                    .filter(tutor => {
                        const tutorId = tutor.id;
                        let grupoTutor = grupos.find(g => g.tutores.find(t => t.id === tutorId));
                        return !(grupoTutor && grupoTutor.alumnos.find(x => x.id === alumnoId));
                    })

                if (remainingTutores && remainingTutores?.length > 0) {
                    let target = grupos
                        .filter((g, i) =>
                            g.alumnos.length < slots[i].alumnosSlots &&
                            alumnoFitness({ ...alumno as Alumno, tutores: remainingTutores as Tutor[] }, g) > 0
                        )
                        .sort((a, b) =>
                            alumnoFitness({ ...alumno as Alumno, tutores: remainingTutores as Tutor[] }, b) -
                            alumnoFitness({ ...alumno as Alumno, tutores: remainingTutores as Tutor[] }, a))[0]

                    if (target?.alumnos != null &&
                        !grupos.find(grupo => grupo.alumnos.findIndex(a => a.id === alumnoId) === target.alumnos.length)) {
                        target.alumnos.push(alumno as Alumno);
                    }
                }

                return grupos;
            }, gruposInicialesTutores);

            return grupos.filter(x => x.alumnos.length > 0 && x.tutores.length > 0);
        };

        return getGroupsDummy(individual, alumnos, tutores, parameters);
    };

    const initHistory = (alumnos: Alumno[], tutores: Tutor[], parameters: OptimizationParameters, rng: Function): History => {

        const alumnosIds = alumnos.map(x => Array(x.tutores.length).fill(null).map(_t => x.id)).flat();
        const tutoresIds = tutores.map(x => x.id);

        const individuals: { [key: string]: Individual } = {};

        for (let i = 0; i < parameters.populationSize; i++) {
            let seed = Math.floor(rng() * 1000000);
            let individualAlumnosIds = shuffleArray(alumnosIds, seed);
            seed = Math.floor(rng() * 1000000);
            let individualTutoresIds = shuffleArray(tutoresIds, seed);
            seed = Math.floor(rng() * 1000000);
            let slots = getSlots(parameters, alumnos, tutores, Math.floor(rng() * 1000000));

            let hash = hashArray([...individualAlumnosIds, ...individualTutoresIds, ...slots.map(x => [x.alumnosSlots, x.tutoresSlots]).flat()]);
            let counter = 0;

            while (individuals[hash] != null) {
                console.log('Duplicate individual found, reshuffling...');
                seed = Math.floor(rng() * 1000000);
                individualAlumnosIds = shuffleArray(alumnosIds, seed);
                seed = Math.floor(rng() * 1000000);
                individualTutoresIds = shuffleArray(tutoresIds, seed);
                seed = Math.floor(rng() * 1000000);
                slots = getSlots(parameters, alumnos, tutores, Math.floor(rng() * 1000000));

                hash = hashArray([...individualAlumnosIds, ...individualTutoresIds, ...slots.map(x => [x.alumnosSlots, x.tutoresSlots]).flat()]);
                counter++;
                if (counter > 100) {
                    throw new Error('Too many attempts to find a unique individual');
                }
            };
            const grupos = calculateGrupos([individualAlumnosIds, tutores.map(t => t.id), slots], alumnos, tutores, parameters);
            const fitness = calculateFitness(grupos, alumnos, parameters);

            individuals[hash] = {
                parentA: null,
                parentB: null,
                generation: 0,
                extintGeneration: null,
                alumnosIds: individualAlumnosIds,
                tutoresIds: individualTutoresIds,
                slots,
                grupos,
                fitness,
            };
        };

        // Calculate initial population statistics
        const initialFitnesses = Object.values(individuals).map(ind => ind.fitness);
        const initialBestFitness = Math.max(...initialFitnesses);
        const initialWorstFitness = Math.min(...initialFitnesses);
        const initialAverageFitness = initialFitnesses.reduce((sum, fitness) => sum + fitness, 0) / initialFitnesses.length;

        console.log(`Initial population - Best: ${initialBestFitness}, Worst: ${initialWorstFitness}, Average: ${initialAverageFitness.toFixed(2)}`);

        return {
            inititialTime: Date.now(),
            endTime: null,
            individuals,
            champion: Object.entries(individuals).sort((a, b) => b[1].fitness - a[1].fitness)[0][1],
            worst: Object.entries(individuals).sort((a, b) => a[1].fitness - b[1].fitness)[0][1],
            populationZero: Object.keys(individuals),
            generations: [],
        };
    };

    const iterate = (history: History, alumnos: Alumno[], tutores: Tutor[], parameters: OptimizationParameters, rng: Function, i: number) => {
        // Get current population (alive individuals)
        const currentPopulation = history.generations.length === 0
            ? history.populationZero
            : history.generations[history.generations.length - 1].individuals;

        const generation: Generation = {
            i,
            inititialTime: Date.now(),
            endTime: null,
            individuals: [],
            tournments: [],
            shuffleRepeats: 0,
            bestFitness: 0,
            worstFitness: Infinity,
            averageFitness: 0
        };

        // Elitism: keep the best individuals
        const sortedPopulation = currentPopulation
            .map(hash => ({ hash, fitness: history.individuals[hash].fitness }))
            .sort((a, b) => b.fitness - a.fitness);

        const elite = sortedPopulation.slice(0, parameters.elitismCount).map(item => item.hash);
        generation.individuals.push(...elite);

        // Generate offspring to fill the rest of the population
        const offspringNeeded = parameters.populationSize - elite.length;
        let duplicateAttempts = 0;

        for (let i = 0; i < offspringNeeded; i++) {
            let offspring: [number[], number[], Slot[]] | null = null;
            let offspringHash: string | null = null;
            let attempts = 0;
            const maxAttempts = 100;

            // Keep trying to create a unique offspring
            while (attempts < maxAttempts) {
                // Tournament selection for parents
                const parentAHash = tournamentSelect(currentPopulation, history.individuals, parameters.tournamentSize, rng);
                const parentBHash = tournamentSelect(currentPopulation, history.individuals, parameters.tournamentSize, rng);

                const parentA = [history.individuals[parentAHash].alumnosIds, history.individuals[parentAHash].tutoresIds, history.individuals[parentAHash].slots] as [number[], number[], Slot[]];
                const parentB = [history.individuals[parentBHash].alumnosIds, history.individuals[parentBHash].tutoresIds, history.individuals[parentAHash].slots] as [number[], number[], Slot[]];

                // Crossover
                if (rng() < parameters.crossoverRate) {
                    offspring = crossover(parentA, parentB, rng);
                } else {
                    offspring = [...parentA]; // Clone parent A
                }

                // Mutation
                if (rng() < parameters.mutationRate) {
                    offspring = mutate(parameters, alumnos, tutores, offspring, rng);
                }

                offspringHash = hashArray(offspring[0].concat(offspring[1]));

                // Check for duplicates in both existing individuals and new generation
                if (!history.individuals[offspringHash] && !generation.individuals.includes(offspringHash)) {

                    // New unique individual found
                    const grupos = calculateGrupos(offspring, alumnos, tutores, parameters);
                    const fitness = calculateFitness(grupos, alumnos, parameters);

                    history.individuals[offspringHash] = {
                        parentA: parentAHash,
                        parentB: parentBHash,
                        generation: history.generations.length + 1,
                        extintGeneration: null,
                        alumnosIds: offspring[0],
                        tutoresIds: offspring[1],
                        slots: offspring[2],
                        grupos,
                        fitness
                    };

                    generation.individuals.push(offspringHash);

                    generation.tournments.push({
                        groupA: [parentAHash],
                        groupB: [parentBHash],
                        result: {
                            parentA: parentAHash,
                            parentB: parentBHash,
                            offspring: offspringHash,
                            crossover: rng() < parameters.crossoverRate
                        }
                    });
                    break;
                }

                attempts++;
                duplicateAttempts++;
            }

            // If we couldn't create a unique offspring after max attempts,
            // use forced mutation to ensure uniqueness
            if (attempts >= maxAttempts) {
                generation.shuffleRepeats++;
                offspring = forcedUniqueIndividual(parameters, alumnos, tutores, history.individuals, generation.individuals, rng);
                offspringHash = hashArray([...offspring[0], ...offspring[1], ...offspring[2].map(x => [x.alumnosSlots, x.tutoresSlots]).flat()]);

                const grupos = calculateGrupos(offspring, alumnos, tutores, parameters);
                const fitness = calculateFitness(grupos, alumnos, parameters);

                history.individuals[offspringHash] = {
                    parentA: null,
                    parentB: null,
                    generation: history.generations.length + 1,
                    extintGeneration: null,
                    alumnosIds: offspring[0],
                    tutoresIds: offspring[1],
                    slots: offspring[2],
                    grupos,
                    fitness
                };

                generation.individuals.push(offspringHash);
            }
        }

        // Mark extinct individuals (those not in new generation)
        currentPopulation.forEach(hash => {
            if (!generation.individuals.includes(hash)) {
                history.individuals[hash].extintGeneration = history.generations.length + 1;
            }
        });

        // Calculate fitness statistics for this generation
        const generationFitnesses = generation.individuals
            .map(hash => history.individuals[hash].fitness);

        generation.bestFitness = Math.max(...generationFitnesses);
        generation.worstFitness = Math.min(...generationFitnesses);
        generation.averageFitness = generationFitnesses.reduce((sum, fitness) => sum + fitness, 0) / generationFitnesses.length;

        // Update champion

        const ranking = generation.individuals
            .map(hash => history.individuals[hash])
            .sort((a, b) => b.fitness - a.fitness)

        const newChampion = ranking[0];
        const newWorst = ranking[ranking.length - 1];

        if (newChampion.fitness > history.champion.fitness) {
            history.champion = newChampion;
        }
        if (newWorst.fitness < history.worst.fitness) {
            history.worst = newWorst;
        }

        generation.endTime = Date.now();
        history.generations.push(generation);

        return history;
    };

    const tournamentSelect = (population: string[], individuals: { [key: string]: Individual }, tournamentSize: number, rng: Function): string => {
        const tournament: string[] = [];
        for (let i = 0; i < tournamentSize; i++) {
            const randomIndex = Math.floor(rng() * population.length);
            tournament.push(population[randomIndex]);
        }

        return tournament.reduce((best, current) =>
            individuals[current].fitness > individuals[best].fitness ? current : best
        );
    };

    const crossover = (parentA: [number[], number[], Slot[]], parentB: [number[], number[], Slot[]], rng: Function): [number[], number[], Slot[]] => {
        // Order crossover (OX) - good for permutations
        const alumnosSize = parentA[0].length;
        const alumnosStart = Math.floor(rng() * alumnosSize);
        const alumnosEnd = Math.floor(rng() * (alumnosSize - alumnosStart)) + alumnosStart;

        const tutoresSize = parentA[1].length;
        const tutoresStart = Math.floor(rng() * tutoresSize);
        const tutoresEnd = Math.floor(rng() * (tutoresSize - tutoresStart)) + tutoresStart;

        const slotsSize = parentA[2].length;
        const slotsStart = Math.floor(rng() * slotsSize);
        const slotsEnd = Math.floor(rng() * (slotsSize - slotsStart)) + slotsStart;

        const offspring = [
            new Array(alumnosSize).fill(-1),
            new Array(tutoresSize).fill(-1),
            new Array(slotsSize).fill({ alumnosSlots: -1, tutoresSlots: -1 })] as [number[], number[], Slot[]
            ];

        // Copy segment from parentA
        for (let i = 0; i <= alumnosSize; i++) {
            if (i > alumnosStart && i < alumnosEnd)
                offspring[0][i] = parentA[0][i];
            else
                offspring[0][i] = parentB[0][i];
        }

        for (let i = 0; i <= tutoresSize; i++) {
            if (i > tutoresStart && i < tutoresEnd)
                offspring[1][i] = parentA[1][i];
            else
                offspring[1][i] = parentB[1][i];
        }

        for (let i = slotsStart; i <= slotsEnd; i++) {
            offspring[2][i] = parentA[2][i];
        }

        //console.log({ alumnosSize, alumnosStart, alumnosEnd, parentA, parentB })
        // Fill remaining positions from parentB
        let currentPos = 0;
        for (let i = 0; i < slotsSize; i++) {
            if (!offspring[2].includes(parentB[2][i])) {
                while (offspring[2][currentPos].alumnosSlots !== -1 ||
                    offspring[2][currentPos].tutoresSlots !== -1
                ) {
                    currentPos++;
                }
                offspring[2][currentPos] = parentB[2][i];
            }
        }

        return offspring;
    };

    const mutate = (parameters: OptimizationParameters, alumnos: Alumno[], tutores: Tutor[], individual: [number[], number[], Slot[]], rng: Function): [number[], number[], Slot[]] => {

        const rnd = rng();
        const mutated = [[...individual[0]], [...individual[1]], [...individual[2]]] as [number[], number[], Slot[]];

        // Swap mutation
        if (rnd < 1 / 3) {
            const pos1 = Math.floor(rng() * mutated[0].length);
            const pos2 = Math.floor(rng() * mutated[0].length);
            [mutated[0][pos1], mutated[0][pos2]] = [mutated[0][pos2], mutated[0][pos1]];
        } else if (rnd < 2 / 3) {
            const pos1 = Math.floor(rng() * mutated[1].length);
            const pos2 = Math.floor(rng() * mutated[1].length);
            [mutated[1][pos1], mutated[1][pos2]] = [mutated[1][pos2], mutated[1][pos1]];
        } else {
            mutated[2] = getSlots(parameters, alumnos, tutores, Math.floor(rng() * 1000000));
        }


        return mutated;
    };

    const forcedUniqueIndividual = (parameters: OptimizationParameters, alumnos: Alumno[], tutores: Tutor[], existingIndividuals: { [key: string]: Individual }, newGeneration: string[], rng: Function): [number[], number[], Slot[]] => {

        let individual: [number[], number[], Slot[]];
        let hash: string;
        const alumnosIds = alumnos.map(x => Array(x.tutores.length).fill(null).map(_t => x.id)).flat();
        const tutoresIds = tutores.map(x => x.id);
        // Keep shuffling until we get a unique one
        do {
            individual = [
                shuffleArray(alumnosIds, Math.floor(rng() * 1000000000)),
                shuffleArray(tutoresIds, Math.floor(rng() * 1000000000)),
                getSlots(parameters, alumnos, tutores, Math.floor(rng() * 1000000000))
            ];
            hash = hashArray([...individual[0], ...individual[1], ...individual[2].map(x => [x.alumnosSlots, x.tutoresSlots]).flat()]);
        } while (existingIndividuals[hash] || newGeneration.includes(hash));

        return individual;
    };

    try {
        console.log('Optimization process started with state:', e);
        const state = e.data as { app: AppState };

        const { alumnosData, tutoresData, parameters } = state.app;
        const { alumnos, tutores, warnings } = prepareData(alumnosData, tutoresData, parameters);
        const { perfectFitness, maxTeoricalFitness } = getMaxScores(alumnos, parameters);

        console.log('Starting genetic algorithm with:', { alumnosData, tutoresData, parameters, alumnos, tutores, warnings, perfectFitness, maxTeoricalFitness });
        let currentBestScore = 0;
        let currentWorstScore = 0;
        const rng =  mulberry32(parameters.seed || 42);
        console.log('RNG initialized with seed', parameters.seed);
        let history = initHistory(alumnos, tutores, parameters, rng);
        let percentageCompleted = 0;
        console.log({ alumnos, tutores, parameters, perfectFitness, maxTeoricalFitness });
        for (let i = 0; i < parameters.geneticIterations && currentBestScore < perfectFitness; i++) {
            iterate(history, alumnos, tutores, parameters, rng, i + 1);
            currentBestScore = history.champion.fitness;
            currentWorstScore = history.worst.fitness;
            percentageCompleted = (i + 1) / parameters.geneticIterations;

            const lastGen = history.generations[history.generations.length - 1];
            console.log(`Iteration ${i + 1}/${parameters.geneticIterations} - ${Math.round(percentageCompleted * 100)}% completed`);
            console.log(`  Generation stats - Best: ${lastGen.bestFitness.toFixed(4)}, Worst: ${lastGen.worstFitness.toFixed(4)}, Avg: ${lastGen.averageFitness.toFixed(4)}`);
            self.postMessage({
                type: "update",
                payload: {
                    combinations: Object.keys(history.individuals).length,
                    runningPercentage: percentageCompleted,
                    generation: lastGen,
                    best: history.champion,
                    worst: history.worst,
                    totalIterations: parameters.geneticIterations,
                    currentBestScore,
                    currentWorstScore,
                    perfectFitness,
                    maxTeoricalFitness
                }
            });
        }

        history.endTime = Date.now();
        console.log('Total duration:', ((history.endTime - history.inititialTime) / 1000.000).toFixed(3), 'seconds');
        console.log('Optimization process finished:', { history, currentBestScore, perfectFitness, maxTeoricalFitness });
        console.log('Best individuals:', Object.entries(history.individuals).sort((a, b) => (b[1].fitness || 0) - (a[1].fitness || 0)).map(x => x[1]));
        const combinationsN = Object.keys(history.individuals).length;
        const geneticSummary = Object.values(history.generations).map((x, i) => ({
            inititialTime: x.inititialTime,
            endTime: x.endTime,
            shuffleRepeats: x.shuffleRepeats,
            bestFitness: x.bestFitness,
            worstFitness: x.worstFitness,
            averageFitness: x.averageFitness,
        }))

        const { inititialTime, endTime, champion, worst } = history
        self.postMessage({
            type: "finish",
            payload: {
                combinationsN, warnings, inititialTime, endTime, champion, worst, parameters, geneticSummary, alumnos, tutores
            }
        });
    } catch (error) {
        console.error('Error optimizing groups:', error);
        self.postMessage({
            type: "error",
            error: error instanceof Error ? error.message : 'Optimization failed',
        });
    }


};