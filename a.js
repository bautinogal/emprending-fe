let tutorsOrderWeigth = [10, 5, 2]; // Peso para cada posición en la lista de preferencias

let tutores = [
    { Nombre: "Ana", Apellido: "López" },
    { Nombre: "Carlos", Apellido: "Sánchez" },
    { Nombre: "Elena", Apellido: "Ramírez" }
]

let alumnos = [
    { Nombre: "Juan", Apellido: "Pérez", preferencias: ["Ana López", "Carlos Sánchez", "Elena Ramírez"] },
    { Nombre: "María", Apellido: "Gómez", preferencias: ["No Existe", "Ana López", "Elena Ramírez"] },
    { Nombre: "Luis", Apellido: "Martínez", preferencias: ["Carlos Sánchez", "Ana López"] },
]

let grupos = [
    { tutores: ["Ana López", "Carlos Sánchez"], alumnos: ["Juan Pérez", "María Gómez"] },
    { tutores: ["Elena Ramírez"], alumnos: ["Luis Martínez"] },
]

const satisfacionJuanPerez = (10 + 5) / (10 + 5 + 2); 
const satisfacionMariaGomez = (5) / (10 + 5 + 2); 
const satisfacionLuisMartinez = (0) / (10 + 5); 

const satisfacionPromedio = (satisfacionJuanPerez + satisfacionMariaGomez + satisfacionLuisMartinez) / 3; // Satisfacción Promedio

const puntajeIdeal = (10 + 5 + 2) + (10 + 5 + 2) + (10 + 2);
const puntajeTotal = (10 + 5) + (5) + (0); 

const puntajeFinal = puntajeObtenido / puntajeTotal; //Puntuación Total 