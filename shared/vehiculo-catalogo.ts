/**
 * Catálogo de marcas y modelos del mercado español.
 *
 * Por qué existe: la API pública de la NHTSA (que se sigue usando como
 * complemento) es el registro de vehículos de EE. UU. Para marcas que allí
 * no se venden —Seat, Cupra, Dacia, Opel, Citroën…— devuelve pocos modelos
 * o ninguno, y para las que sí se venden devuelve los nombres del mercado
 * americano. Este catálogo cubre lo que de verdad circula por España,
 * incluidos vehículos de segunda mano de los últimos ~20 años.
 *
 * No pretende ser exhaustivo: el campo es de texto libre y el
 * autocompletado no bloquea, así que lo que falte se puede escribir a
 * mano. Ampliarlo es tan simple como añadir una línea aquí.
 */

/** Turismos y furgonetas. */
const MODELOS_COCHE: Record<string, string[]> = {
  Abarth: ['500', '595', '695', '124 Spider'],
  'Alfa Romeo': ['147', '156', '159', 'Brera', 'Giulia', 'Giulietta', 'MiTo', 'Stelvio', 'Tonale'],
  Audi: [
    'A1', 'A3', 'A4', 'A4 Allroad', 'A5', 'A6', 'A7', 'A8', 'Q2', 'Q3', 'Q4 e-tron',
    'Q5', 'Q7', 'Q8', 'e-tron', 'TT', 'R8', 'RS3', 'RS6', 'S3',
  ],
  BMW: [
    'Serie 1', 'Serie 2', 'Serie 2 Active Tourer', 'Serie 3', 'Serie 4', 'Serie 5',
    'Serie 6', 'Serie 7', 'Serie 8', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7',
    'Z4', 'i3', 'i4', 'iX', 'iX3', 'M3', 'M4',
  ],
  BYD: ['Atto 3', 'Dolphin', 'Seal', 'Seal U', 'Han', 'Tang'],
  Chevrolet: ['Aveo', 'Captiva', 'Cruze', 'Matiz', 'Orlando', 'Spark'],
  Chrysler: ['300C', 'Voyager', 'PT Cruiser'],
  Citroën: [
    'C1', 'C2', 'C3', 'C3 Aircross', 'C4', 'C4 Cactus', 'C4 Picasso', 'C4 SpaceTourer',
    'C4 X', 'C5', 'C5 Aircross', 'C5 X', 'C15', 'Berlingo', 'Jumper', 'Jumpy',
    'Xsara', 'Xsara Picasso', 'Saxo', 'ë-C4',
  ],
  Cupra: ['Ateca', 'Born', 'Formentor', 'León', 'Tavascan', 'Terramar'],
  Dacia: ['Dokker', 'Duster', 'Jogger', 'Lodgy', 'Logan', 'Sandero', 'Sandero Stepway', 'Spring'],
  DS: ['DS3', 'DS3 Crossback', 'DS4', 'DS5', 'DS7 Crossback', 'DS9'],
  Fiat: [
    '500', '500L', '500X', '600', 'Bravo', 'Doblò', 'Ducato', 'Panda', 'Punto',
    'Scudo', 'Stilo', 'Tipo', 'Talento',
  ],
  Ford: [
    'B-Max', 'C-Max', 'EcoSport', 'Edge', 'Explorer', 'Fiesta', 'Focus', 'Fusion',
    'Galaxy', 'Ka', 'Kuga', 'Mondeo', 'Mustang', 'Mustang Mach-E', 'Puma', 'Ranger',
    'S-Max', 'Tourneo Connect', 'Tourneo Custom', 'Transit', 'Transit Connect', 'Transit Custom',
  ],
  Honda: ['Accord', 'Civic', 'CR-V', 'HR-V', 'Insight', 'Jazz', 'ZR-V', 'e'],
  Hyundai: [
    'Bayon', 'i10', 'i20', 'i30', 'i40', 'Ioniq', 'Ioniq 5', 'Ioniq 6', 'Kona',
    'Santa Fe', 'Tucson', 'ix20', 'ix35',
  ],
  Infiniti: ['Q30', 'Q50', 'QX30'],
  Isuzu: ['D-Max'],
  Iveco: ['Daily'],
  Jaguar: ['E-Pace', 'F-Pace', 'F-Type', 'I-Pace', 'XE', 'XF'],
  Jeep: ['Avenger', 'Cherokee', 'Compass', 'Grand Cherokee', 'Renegade', 'Wrangler'],
  Kia: [
    'Carens', 'Ceed', 'EV3', 'EV6', 'EV9', 'Niro', 'Optima', 'Picanto', 'ProCeed',
    'Rio', 'Sorento', 'Soul', 'Sportage', 'Stonic', 'Venga', 'XCeed',
  ],
  Lancia: ['Delta', 'Musa', 'Ypsilon'],
  'Land Rover': [
    'Defender', 'Discovery', 'Discovery Sport', 'Freelander', 'Range Rover',
    'Range Rover Evoque', 'Range Rover Sport', 'Range Rover Velar',
  ],
  Lexus: ['CT', 'ES', 'IS', 'LBX', 'NX', 'RX', 'UX'],
  Maserati: ['Ghibli', 'Grecale', 'Levante'],
  Mazda: ['2', '3', '6', 'CX-3', 'CX-30', 'CX-5', 'CX-60', 'MX-5', 'MX-30'],
  'Mercedes-Benz': [
    'Clase A', 'Clase B', 'Clase C', 'Clase E', 'Clase S', 'Clase V', 'CLA', 'CLS',
    'EQA', 'EQB', 'EQC', 'EQE', 'EQS', 'GLA', 'GLB', 'GLC', 'GLE', 'GLK', 'SLK',
    'Citan', 'Sprinter', 'Vito',
  ],
  MG: ['MG3', 'MG4', 'MG5', 'HS', 'ZS', 'Marvel R'],
  Mini: ['Mini', 'Clubman', 'Countryman', 'Cabrio'],
  Mitsubishi: ['ASX', 'Eclipse Cross', 'L200', 'Montero', 'Outlander', 'Space Star'],
  Nissan: [
    'Ariya', 'Juke', 'Leaf', 'Micra', 'Navara', 'Note', 'NV200', 'Pulsar',
    'Qashqai', 'X-Trail', 'Primastar', 'Townstar',
  ],
  Omoda: ['5', '7'],
  Opel: [
    'Adam', 'Astra', 'Combo', 'Corsa', 'Crossland', 'Frontera', 'Grandland',
    'Insignia', 'Karl', 'Meriva', 'Mokka', 'Movano', 'Vivaro', 'Zafira',
  ],
  Peugeot: [
    '106', '107', '108', '206', '207', '208', '2008', '306', '307', '308', '3008',
    '406', '407', '408', '508', '5008', 'Bipper', 'Boxer', 'Expert', 'Partner',
    'Rifter', 'Traveller', 'e-208', 'e-2008',
  ],
  Polestar: ['2', '3', '4'],
  Porsche: ['911', 'Boxster', 'Cayenne', 'Cayman', 'Macan', 'Panamera', 'Taycan'],
  Renault: [
    'Arkana', 'Austral', 'Captur', 'Clio', 'Espace', 'Kadjar', 'Kangoo', 'Koleos',
    'Laguna', 'Master', 'Mégane', 'Mégane E-Tech', 'Modus', 'Rafale', 'Scénic',
    'Symbioz', 'Talisman', 'Trafic', 'Twingo', 'Zoe',
  ],
  Rover: ['25', '45', '75'],
  Saab: ['9-3', '9-5'],
  Seat: [
    'Alhambra', 'Altea', 'Arona', 'Arosa', 'Ateca', 'Córdoba', 'Exeo', 'Ibiza',
    'Inca', 'León', 'Marbella', 'Mii', 'Tarraco', 'Toledo',
  ],
  Škoda: [
    'Citigo', 'Elroq', 'Enyaq', 'Fabia', 'Kamiq', 'Karoq', 'Kodiaq', 'Octavia',
    'Rapid', 'Roomster', 'Scala', 'Superb', 'Yeti',
  ],
  Smart: ['ForTwo', 'ForFour', '#1', '#3'],
  SsangYong: ['Korando', 'Rexton', 'Tivoli', 'XLV'],
  Subaru: ['Forester', 'Impreza', 'Outback', 'XV'],
  Suzuki: ['Across', 'Baleno', 'Ignis', 'Jimny', 'S-Cross', 'Swift', 'Vitara'],
  Tesla: ['Model 3', 'Model S', 'Model X', 'Model Y'],
  Toyota: [
    'Auris', 'Avensis', 'Aygo', 'Aygo X', 'bZ4X', 'C-HR', 'Corolla', 'Corolla Cross',
    'Hilux', 'Land Cruiser', 'Prius', 'Proace', 'RAV4', 'Yaris', 'Yaris Cross',
  ],
  Volkswagen: [
    'Amarok', 'Arteon', 'Caddy', 'California', 'Caravelle', 'Crafter', 'Golf',
    'Golf Sportsvan', 'ID.3', 'ID.4', 'ID.5', 'ID.7', 'ID. Buzz', 'Jetta', 'Passat',
    'Polo', 'Scirocco', 'Sharan', 'T-Cross', 'T-Roc', 'Taigo', 'Tiguan', 'Touareg',
    'Touran', 'Transporter', 'up!',
  ],
  Volvo: ['C40', 'EX30', 'S60', 'S90', 'V40', 'V50', 'V60', 'V90', 'XC40', 'XC60', 'XC90'],
}

/** Motocicletas y ciclomotores. */
const MODELOS_MOTO: Record<string, string[]> = {
  Aprilia: ['RS 660', 'RSV4', 'SR', 'Tuareg 660', 'Tuono'],
  Benelli: ['Leoncino', 'TRK 502', 'TRK 702'],
  Daelim: ['Daystar', 'S-Five'],
  Derbi: ['Senda', 'Variant'],
  Ducati: ['Diavel', 'Monster', 'Multistrada', 'Panigale', 'Scrambler', 'Streetfighter'],
  'Gas Gas': ['EC', 'MC', 'TXT'],
  'Harley-Davidson': ['Fat Boy', 'Iron 883', 'Nightster', 'Pan America', 'Sportster', 'Street Bob'],
  Husqvarna: ['Norden 901', 'Svartpilen', 'Vitpilen'],
  Kawasaki: ['ER-6n', 'Ninja 400', 'Ninja 650', 'Versys', 'Vulcan', 'Z650', 'Z900'],
  Keeway: ['RKF', 'Superlight'],
  KTM: ['125 Duke', '390 Duke', '790 Duke', '890 Adventure', '1290 Super Duke', 'RC 390'],
  Kymco: ['Agility', 'AK 550', 'Downtown', 'Like', 'People', 'Super Dink', 'X-Town'],
  Macbor: ['Montana XR', 'Rockster'],
  Montesa: ['Cota'],
  'Moto Guzzi': ['V7', 'V85 TT', 'V100 Mandello'],
  'MV Agusta': ['Brutale', 'Dragster', 'F3'],
  Piaggio: ['Beverly', 'Liberty', 'Medley', 'MP3', 'Zip'],
  Rieju: ['MRT', 'Marathon', 'Tango'],
  'Royal Enfield': ['Classic 350', 'Continental GT', 'Himalayan', 'Hunter 350', 'Interceptor 650'],
  Sherco: ['SE', 'ST'],
  SYM: ['Ced', 'Jet 14', 'Joymax', 'Symphony'],
  Triumph: ['Bonneville', 'Speed Triple', 'Street Triple', 'Tiger', 'Trident 660'],
  Vespa: ['GTS', 'Primavera', 'Sprint'],
  Voge: ['300 Rally', '525 DSX', '900 DSX'],
  Yamaha: [
    'MT-03', 'MT-07', 'MT-09', 'NMAX', 'R1', 'R6', 'Tenere 700', 'Tmax',
    'Tracer 7', 'Tracer 9', 'XMAX', 'XSR700',
  ],
  Zontes: ['310 T', '350 X', '703 F'],
}

/** Marcas que solo hacen motos: se ofrecen igual, el campo Tipo es aparte. */
const MODELOS: Record<string, string[]> = { ...MODELOS_COCHE, ...MODELOS_MOTO }

// Honda, Suzuki, Peugeot y BMW fabrican coche y moto: se fusionan las dos
// listas en vez de que una pise a la otra.
for (const marca of ['Honda', 'Suzuki', 'BMW', 'Peugeot']) {
  const coche = MODELOS_COCHE[marca] ?? []
  const moto = MODELOS_MOTO[marca] ?? []
  if (coche.length && moto.length) MODELOS[marca] = [...coche, ...moto]
}

MODELOS.Honda = [
  ...(MODELOS_COCHE.Honda ?? []),
  'CB125R', 'CB500F', 'CB650R', 'CBR600RR', 'CRF1100L Africa Twin', 'Forza', 'NC750X', 'PCX', 'SH125', 'Transalp',
]
MODELOS.Suzuki = [
  ...(MODELOS_COCHE.Suzuki ?? []),
  'Bandit', 'Burgman', 'GSX-R', 'GSX-S', 'SV650', 'V-Strom',
]
MODELOS.BMW = [
  ...(MODELOS_COCHE.BMW ?? []),
  'C 400', 'F 750 GS', 'F 850 GS', 'G 310 R', 'R 1250 GS', 'R nineT', 'S 1000 RR',
]
MODELOS.Peugeot = [...(MODELOS_COCHE.Peugeot ?? []), 'Django', 'Kisbee', 'Metropolis', 'Tweet']

/** Marcas sin modelos detallados (poco frecuentes, pero deben poder elegirse). */
const MARCAS_SIN_MODELOS = [
  'Aston Martin', 'Bentley', 'Cadillac', 'Dodge', 'Ferrari', 'Fuso', 'Lamborghini',
  'Lotus', 'Maxus', 'McLaren', 'Rolls-Royce', 'Daewoo', 'Lada', 'Leapmotor',
  'Lynk & Co', 'Mahindra', 'Nio', 'Piaggio Commercial', 'Skywell', 'Xpeng',
]

/** Todas las marcas del catálogo, ordenadas alfabéticamente en español. */
export const MARCAS_CATALOGO: string[] = [
  ...new Set([...Object.keys(MODELOS), ...MARCAS_SIN_MODELOS]),
].sort((a, b) => a.localeCompare(b, 'es'))

/**
 * Normaliza para poder buscar sin depender de tildes, mayúsculas ni
 * espacios: "citroen", "CITROËN" y " Citroën " son la misma marca.
 */
function normaliza(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

const INDICE_MARCAS = new Map(Object.keys(MODELOS).map((m) => [normaliza(m), m]))

/** Modelos de una marca del catálogo. Devuelve [] si la marca no está. */
export function modelosDeMarca(marca: string): string[] {
  const clave = INDICE_MARCAS.get(normaliza(marca))
  if (!clave) return []
  return [...MODELOS[clave]].sort((a, b) => a.localeCompare(b, 'es'))
}
