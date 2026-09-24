export const PyDocs = [
    {
        "category": "Funciones integradas",
        "items": [
            { "name": "print()", "desc": "Muestra texto o valores por consola. Puede recibir varios argumentos separados por comas.", "example": "print('Hola', 42)\n# Hola 42" },
            { "name": "len()", "desc": "Devuelve la cantidad de elementos de una secuencia (string, lista, tupla, dict…).", "example": "len('python')  # 6" },
            { "name": "int()", "desc": "Convierte un valor a entero. Útil para transformar texto numérico.", "example": "int('42') + 8  # 50" },
            { "name": "float()", "desc": "Convierte un valor a número de punto flotante.", "example": "float('3.5')  # 3.5" },
            { "name": "str()", "desc": "Convierte un valor a texto (string).", "example": "str(5) + ' manzanas'  # '5 manzanas'" },
            { "name": "range()", "desc": "Genera una secuencia de números. range(inicio, fin, paso) no incluye el fin.", "example": "list(range(1, 5))  # [1, 2, 3, 4]" },
            { "name": "sum()", "desc": "Suma todos los elementos de una secuencia numérica.", "example": "sum([1, 2, 3])  # 6" },
            { "name": "abs()", "desc": "Devuelve el valor absoluto de un número.", "example": "abs(-7)  # 7" },
            { "name": "round()", "desc": "Redondea un número a un número de decimales.", "example": "round(3.14159, 2)  # 3.14" },
            { "name": "sorted()", "desc": "Devuelve una nueva lista ordenada a partir de un iterable.", "example": "sorted([3, 1, 2])  # [1, 2, 3]" },
            { "name": "enumerate()", "desc": "Recorre una secuencia devolviendo (índice, valor).", "example": "list(enumerate('ab'))  # [(0, 'a'), (1, 'b')]" }
        ]
    },
    {
        "category": "Estructuras de control",
        "items": [
            { "name": "if / elif / else", "desc": "Toma decisiones según condiciones. Las líneas de cada bloque deben estar indentadas con 4 espacios.", "example": "if x > 0:\n    print('positivo')\nelse:\n    print('cero o negativo')" },
            { "name": "for", "desc": "Itera sobre los elementos de una secuencia o de range().", "example": "for i in range(3):\n    print(i)" },
            { "name": "while", "desc": "Repite un bloque mientras una condición sea verdadera. Ojo: no olvides avanzar la condición.", "example": "n = 3\nwhile n > 0:\n    print(n)\n    n = n - 1" },
            { "name": "break", "desc": "Termina el bucle actual de inmediato.", "example": "for i in range(10):\n    if i == 3:\n        break\n    print(i)" },
            { "name": "continue", "desc": "Salta a la siguiente iteración del bucle sin ejecutar el resto del bloque.", "example": "for i in range(5):\n    if i == 2:\n        continue\n    print(i)" },
            { "name": "def", "desc": "Define una función reutilizable con o sin parámetros y con return.", "example": "def suma(a, b):\n    return a + b" },
            { "name": "class", "desc": "Define una clase: plantilla con atributos (__init__) y métodos.", "example": "class Perro:\n    def __init__(self, nombre):\n        self.nombre = nombre\n    def ladrar(self):\n        return self.nombre + ' dice guau'" },
            { "name": "try / except", "desc": "Captura errores en tiempo de ejecución para evitar que el programa se detenga.", "example": "try:\n    int('abc')\nexcept ValueError:\n    print('no válido')" }
        ]
    },
    {
        "category": "Tipos y estructuras de datos",
        "items": [
            { "name": "int", "desc": "Números enteros (sin decimales).", "example": "edad = 36" },
            { "name": "float", "desc": "Números con parte decimal.", "example": "pi = 3.14" },
            { "name": "str", "desc": "Cadenas de texto. Se escriben con comillas simples o dobles.", "example": "saludo = 'hola'" },
            { "name": "bool", "desc": "Valores lógicos True o False.", "example": "activo = True" },
            { "name": "f-strings", "desc": "Insertan variables dentro de texto con la letra f delante y {} para el valor.", "example": "nombre = 'Ana'\nprint(f'Bienvenida, {nombre}')" },
            { "name": "list", "desc": "Colección ordenada y modificable. Se indexa desde 0 y permite [-1] para el último.", "example": "frutas = ['a', 'b']\nfrutas.append('c')" },
            { "name": "tuple", "desc": "Colección ordenada e inmutable. Se puede desempaquetar.", "example": "punto = (4, 7)\nx, y = punto" },
            { "name": "dict", "desc": "Colección de pares clave: valor. Acceso con [] o .get().", "example": "p = {'nombre': 'Ana'}\np.get('ciudad', 'X')" },
            { "name": "Comprensión de listas", "desc": "Crea listas de forma compacta con filtros opcionales.", "example": "[n * 2 for n in [1, 2, 3] if n > 1]  # [4, 6]" }
        ]
    },
    {
        "category": "Módulos",
        "items": [
            { "name": "math", "desc": "Funciones matemáticas avanzadas: sqrt, floor, pow, pi…", "example": "import math\nmath.sqrt(16)  # 4.0" },
            { "name": "random", "desc": "Genera valores aleatorios (randint, choice, shuffle…).", "example": "import random\nrandom.randint(1, 10)" },
            { "name": "json", "desc": "Convierte texto JSON en estructuras Python y viceversa.", "example": "import json\njson.loads('{\"a\": 1}')  # {'a': 1}" },
            { "name": "re", "desc": "Búsqueda avanzada con expresiones regulares.", "example": "import re\nre.findall(r'\\d+', 'a1 b22')  # ['1', '22']" }
        ]
    },
    {
        "category": "Conceptos avanzados",
        "items": [
            { "name": "lambda", "desc": "Función anónima de una línea. Ideal como key= en sorted().", "example": "sorted([(1, 5), (2, 1)], key=lambda p: p[1])" },
            { "name": "Recursión", "desc": "Una función que se llama a sí misma con un caso base que detiene la recursión.", "example": "def fact(n):\n    return 1 if n <= 1 else n * fact(n - 1)" },
            { "name": "Generadores (yield)", "desc": "Producen valores bajo demanda sin guardar todos en memoria.", "example": "def pares(lim):\n    for n in range(0, lim, 2):\n        yield n" },
            { "name": "Decoradores", "desc": "Funciones que envuelven otras para añadir comportamiento con @.", "example": "def decorador(f):\n    def env():\n        print('---')\n        f()\n    return env\n\n@decorador\ndef hola():\n    print('hola')" },
            { "name": "*args", "desc": "Parámetro que agrupa cualquier cantidad de argumentos en una tupla.", "example": "def suma(*args):\n    return sum(args)\nsuma(1, 2, 3)  # 6" },
            { "name": "Condicional ternario", "desc": "Condicional en una sola expresión: valor_si_true if condicion else valor_si_false.", "example": "'mayor' if edad >= 18 else 'menor'" }
        ]
    }
];