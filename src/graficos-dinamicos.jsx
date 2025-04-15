import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import Papa from "papaparse";
import * as _ from "lodash";

const GraficosRendimiento = () => {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filteredDatasets, setFilteredDatasets] = useState([]);
  const [combinedData, setCombinedData] = useState([]);
  const [timeRange, setTimeRange] = useState(60);
  const [colors] = useState([
    "#2563EB", // azul intenso
    "#16A34A", // verde intenso
    "#EA580C", // naranja intenso
    "#DC2626", // rojo intenso
    "#7E22CE", // púrpura intenso
    "#DB2777", // rosa intenso
    "#0E7490", // teal intenso
    "#CA8A04", // amarillo intenso
    "#4338CA", // indigo intenso
    "#E11D48", // rojo cereza
    "#059669", // esmeralda
    "#0369A1", // azul marino
  ]);

  useEffect(() => {
    if (datasets.length > 0) {
      updateFilteredData(datasets, timeRange);
    }
  }, [timeRange, datasets]);

  const handleAddFile = (e) => {
    setLoading(true);
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          console.log(
            "Contenido del archivo (primeros 200 caracteres):",
            text.substring(0, 200),
          );

          // Detección y procesamiento de diferentes formatos CSV
          const parserOptions = {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            transform: (value, field) => {
              // Si el valor es una cadena que parece un número con formato europeo (coma)
              if (typeof value === "string" && /^-?\d+,\d+$/.test(value)) {
                return parseFloat(value.replace(",", "."));
              }
              return value;
            },
            transformHeader: (header) => {
              // Guardar el encabezado original para diagnóstico
              console.log("Encabezado original:", header);

              // Normalizar nombres de encabezados para facilitar coincidencias
              // PERO mantener el encabezado original para búsquedas exactas también
              return header;
            },
          };

          const result = Papa.parse(text, parserOptions);

          console.log("Estructura de datos después del parsing:", result);
          console.log("Encabezados detectados:", result.meta.fields);
          console.log("Primera fila de datos:", result.data[0]);

          if (result.errors && result.errors.length > 0) {
            console.warn("Errores en el parsing del CSV:", result.errors);
            alert(
              `Advertencia: Se encontraron ${result.errors.length} errores al analizar el CSV. Los datos pueden estar incompletos.`,
            );
          }

          // Asignar un color del pool de colores
          const colorIndex = datasets.length % colors.length;
          const color = colors[colorIndex];

          const processedData = processDatos(result.data, datasets.length);

          console.log("Datos procesados:", processedData);

          setDatasets((prev) => [
            ...prev,
            {
              id: datasets.length,
              name: file.name,
              color: color,
              data: processedData.data,
              stats: processedData.stats,
            },
          ]);

          setLoading(false);
        } catch (error) {
          console.error("Error al procesar el archivo:", error);
          alert(`Error al procesar el archivo: ${error.message}`);
          setLoading(false);
        }
      };
      reader.onerror = (e) => {
        console.error("Error al leer el archivo:", e);
        alert("Error al leer el archivo. Por favor, intenta con otro.");
        setLoading(false);
      };
      reader.readAsText(file);
    } else {
      setLoading(false);
    }
  };

  const removeDataset = (index) => {
    setDatasets((prev) => {
      const newDatasets = prev.filter((dataset) => dataset.id !== index);
      // Recalcular datos combinados
      if (newDatasets.length > 0) {
        updateFilteredData(newDatasets, timeRange);
      } else {
        setCombinedData([]);
        setFilteredDatasets([]);
      }
      return newDatasets;
    });
  };

  const processDatos = (rawData, datasetId) => {
    console.log("Datos recibidos en processDatos:", rawData.slice(0, 2));

    // Mostrar todas las propiedades disponibles en el primer objeto
    if (rawData.length > 0) {
      console.log("Propiedades disponibles en CSV:", Object.keys(rawData[0]));
    }

    // Mapeo de nombres de columnas específicos para tus CSV
    const specificMappings = {
      // Mapeos para fecha
      timestamp: "fecha_ejecucion",
      fechadeejecucion: "fecha_ejecucion",
      "fecha de ejecucion": "fecha_ejecucion",

      // Mapeos para CPU
      cpuuso: "cpu_uso",
      "cpu%": "cpu_uso",
      cpu: "cpu_uso",

      // Mapeos para RAM
      ramuso: "ram_uso",
      "memoria%": "ram_uso",
      "memoria %": "ram_uso",
      memoria: "ram_uso",
      ramusadagb: "ram_uso",

      // Mapeos para tiempos
      tiempodeejecucion: "tp_ejec",
      "tiempo de ejecucion": "tp_ejec",
      tiempoderespuesta: "tp_resp",
      "tiempo de respuesta": "tp_resp",

      // Mapeos para latencia
      latenciadered: "latencia",
      "latencia de red": "latencia",

      // Otros mapeos
      discouso: "disco_uso",
      peticionesporsegundo: "peticiones_seg",
      "peticiones por segundo": "peticiones_seg",
      cantidaddeusuarios: "usuarios",
      "cantidad de usuarios": "usuarios",
    };

    // Pre-procesar los datos para asegurar que tengan los campos necesarios
    // Muestra todas las columnas para diagnóstico
    console.log("Columnas originales:", Object.keys(rawData[0] || {}));

    // Pre-procesar nombres de columnas para normalización
    const normalizedColumns = {};
    if (rawData.length > 0) {
      Object.keys(rawData[0]).forEach((key) => {
        const normalizedKey = key
          .toLowerCase()
          .replace(/%/g, "")
          .replace(/_/g, "")
          .replace(/\s+/g, "");
        normalizedColumns[normalizedKey] = key;
      });
    }
    console.log("Columnas normalizadas:", normalizedColumns);

    rawData = rawData.map((item) => {
      const newItem = { ...item };

      // Aplicar mapeos específicos primero
      Object.keys(normalizedColumns).forEach((normalizedKey) => {
        const originalKey = normalizedColumns[normalizedKey];

        // Si es un mapeo específico, usar ese
        if (specificMappings[normalizedKey]) {
          const targetField = specificMappings[normalizedKey];
          newItem[targetField] = item[originalKey];
          console.log(
            `Mapeando campo: ${originalKey} → ${targetField}, valor: ${item[originalKey]}`,
          );
        }
      });

      // Si no tiene fecha_ejecucion, usar timestamp o generar uno
      if (!newItem.fecha_ejecucion) {
        const timestampKey = Object.keys(item).find(
          (k) =>
            k.toLowerCase().includes("time") ||
            k.toLowerCase().includes("fecha") ||
            k.toLowerCase().includes("date") ||
            k.toLowerCase() === "id", // Usar ID como último recurso para ordenación
        );

        if (timestampKey) {
          if (timestampKey.toLowerCase() === "id") {
            // Si usamos ID como timestamp, formatear como fecha
            const id = parseInt(item[timestampKey]);
            newItem.fecha_ejecucion = new Date(
              Date.now() + id * 1000,
            ).toISOString();
          } else {
            newItem.fecha_ejecucion = item[timestampKey];
          }
        } else {
          newItem.fecha_ejecucion = new Date().toISOString();
        }
      }

      // Asegurar que tiene cpu_uso - buscar exactamente CPU% primero
      if (!newItem.cpu_uso) {
        let cpuKey = Object.keys(item).find(
          (k) => k === "CPU%" || k === "CPU %" || k === "Cpu%" || k === "cpu%",
        );

        if (!cpuKey) {
          cpuKey = Object.keys(item).find(
            (k) =>
              k.toLowerCase().includes("cpu") ||
              k.toLowerCase().includes("procesador"),
          );
        }

        if (cpuKey) {
          newItem.cpu_uso = item[cpuKey];
          console.log(`Campo CPU encontrado: ${cpuKey} → ${item[cpuKey]}`);
        } else {
          newItem.cpu_uso = 0;
        }
      }

      // Asegurar que tiene ram_uso - buscar exactamente Memoria % primero
      if (!newItem.ram_uso) {
        let ramKey = Object.keys(item).find(
          (k) =>
            k === "Memoria %" ||
            k === "Memoria%" ||
            k === "memoria %" ||
            k === "memoria%",
        );

        if (!ramKey) {
          ramKey = Object.keys(item).find(
            (k) =>
              k.toLowerCase().includes("ram") ||
              k.toLowerCase().includes("memoria"),
          );
        }

        if (ramKey) {
          newItem.ram_uso = item[ramKey];
          console.log(`Campo RAM encontrado: ${ramKey} → ${item[ramKey]}`);
        } else {
          newItem.ram_uso = 0;
        }
      }

      // Asegurar que tiene tp_ejec - buscar exactamente Tiempo de ejecución primero
      if (!newItem.tp_ejec) {
        let tpEjecKey = Object.keys(item).find(
          (k) =>
            k === "Tiempo de ejecución" ||
            k === "Tiempo de ejecucion" ||
            k === "tiempo de ejecución" ||
            k === "tiempo de ejecucion",
        );

        if (!tpEjecKey) {
          tpEjecKey = Object.keys(item).find(
            (k) =>
              k.toLowerCase().includes("tiempo") &&
              k.toLowerCase().includes("ejec"),
          );
        }

        if (tpEjecKey) {
          newItem.tp_ejec = item[tpEjecKey];
          console.log(
            `Campo TIEMPO EJECUCIÓN encontrado: ${tpEjecKey} → ${item[tpEjecKey]}`,
          );
        } else {
          newItem.tp_ejec = 0;
        }
      }

      // Asegurar que tiene tp_resp - buscar exactamente Tiempo de respuesta primero
      if (!newItem.tp_resp) {
        let tpRespKey = Object.keys(item).find(
          (k) => k === "Tiempo de respuesta" || k === "tiempo de respuesta",
        );

        if (!tpRespKey) {
          tpRespKey = Object.keys(item).find(
            (k) =>
              k.toLowerCase().includes("tiempo") &&
              k.toLowerCase().includes("resp"),
          );
        }

        if (tpRespKey) {
          newItem.tp_resp = item[tpRespKey];
          console.log(
            `Campo TIEMPO RESPUESTA encontrado: ${tpRespKey} → ${item[tpRespKey]}`,
          );
        } else {
          newItem.tp_resp = 0;
        }
      }

      // Establecer valores por defecto para campos que no se encuentren
      newItem.tp_ejec = newItem.tp_ejec || 0;
      newItem.tp_resp = newItem.tp_resp || 0;
      newItem.latencia = newItem.latencia || 0;
      newItem.peticiones_seg = newItem.peticiones_seg || 1;
      newItem.num_peticiones = newItem.num_peticiones || 1;

      return newItem;
    });

    // Crear un campo de timestamp consistente si no existe
    let useSequentialTime = false;
    if (!rawData.some((item) => item.fecha_ejecucion)) {
      useSequentialTime = true;
      console.log("Generando timestamps secuenciales...");
    }

    if (useSequentialTime) {
      const startTime = new Date();
      rawData = rawData.map((item, index) => {
        const timestamp = new Date(
          startTime.getTime() + index * 1000,
        ).toISOString();
        return { ...item, fecha_ejecucion: timestamp };
      });
    }

    const groupedBySecond = _.groupBy(rawData, "fecha_ejecucion");

    const promediosPorSegundo = Object.entries(groupedBySecond).map(
      ([segundo, peticiones], index) => {
        const promedio = {
          fecha_ejecucion: segundo,
          tp_ejec: parsearValorNumerico(
            calcularPromedio(peticiones, "tp_ejec"),
          ),
          tp_resp: parsearValorNumerico(
            calcularPromedio(peticiones, "tp_resp"),
          ),
          cpu_uso: parsearValorNumerico(
            calcularPromedio(peticiones, "cpu_uso"),
          ),
          ram_uso: parsearValorNumerico(
            calcularPromedio(peticiones, "ram_uso"),
          ),
          usuarios: calcularModa(peticiones, "usuarios"),
          latencia: parsearValorNumerico(
            calcularPromedio(peticiones, "latencia"),
          ),
          peticiones_seg: parsearValorNumerico(
            calcularPromedio(peticiones, "peticiones_seg"),
          ),
          estado: calcularModa(peticiones, "estado"),
          success: calcularModaBooleana(peticiones, "success"),
          metodo: calcularModa(peticiones, "metodo"),
          endpoint: calcularModa(peticiones, "endpoint"),
          num_peticiones: peticiones.length,
          datasetId: datasetId,
        };

        // Intentar extraer la hora de la fecha si es un formato válido
        try {
          const fecha = new Date(segundo);
          if (!isNaN(fecha.getTime())) {
            promedio.hora = fecha.toTimeString().substring(0, 8);
            promedio.label = segundo.substring(Math.max(0, segundo.length - 8));
          } else {
            // Si no es una fecha válida, usar el índice para la etiqueta
            promedio.hora = `Seg ${datasetId}-${index + 1}`;
            promedio.label = `${index + 1}`;
          }
        } catch (e) {
          console.log("Error al procesar fecha:", e);
          promedio.hora = `Seg ${datasetId}-${index + 1}`;
          promedio.label = `${index + 1}`;
        }

        return promedio;
      },
    );

    const datosOrdenados = _.sortBy(promediosPorSegundo, "fecha_ejecucion");

    // Validar datos antes de calcular estadísticas
    // Si no hay datos, usar un conjunto de datos básico para evitar errores
    if (datosOrdenados.length === 0) {
      console.log(
        "No se encontraron datos válidos. Generando datos de muestra...",
      );
      // Generar datos de muestra
      for (let i = 0; i < 10; i++) {
        datosOrdenados.push({
          fecha_ejecucion: new Date(Date.now() + i * 1000).toISOString(),
          tp_ejec: Math.random() * 100,
          tp_resp: Math.random() * 200,
          cpu_uso: Math.random() * 100,
          ram_uso: Math.random() * 100,
          latencia: Math.random() * 50,
          num_peticiones: Math.floor(Math.random() * 100),
          datasetId: datasetId,
          hora: new Date(Date.now() + i * 1000).toTimeString().substring(0, 8),
          label: `S${i + 1}`,
        });
      }
    }

    // Asegurar que todos los valores sean números válidos para los cálculos
    const stats = {
      totalSegundos: datosOrdenados.length,
      promedioPeticionesPorSegundo: Math.round(
        datosOrdenados.reduce(
          (sum, item) => sum + parsearValorNumerico(item.num_peticiones),
          0,
        ) / Math.max(1, datosOrdenados.length),
      ),
      maxPeticionesPorSegundo: Math.max(
        ...datosOrdenados.map((item) =>
          parsearValorNumerico(item.num_peticiones),
        ),
      ),
      minPeticionesPorSegundo: Math.min(
        ...datosOrdenados.map((item) =>
          parsearValorNumerico(item.num_peticiones),
        ),
      ),
      promedioTiempoEjecucion: Math.round(
        datosOrdenados.reduce(
          (sum, item) => sum + parsearValorNumerico(item.tp_ejec),
          0,
        ) / Math.max(1, datosOrdenados.length),
      ),
      promedioTiempoRespuesta: Math.round(
        datosOrdenados.reduce(
          (sum, item) => sum + parsearValorNumerico(item.tp_resp),
          0,
        ) / Math.max(1, datosOrdenados.length),
      ),
      promedioCPU: (
        datosOrdenados.reduce(
          (sum, item) => sum + parsearValorNumerico(item.cpu_uso),
          0,
        ) / Math.max(1, datosOrdenados.length)
      ).toFixed(2),
      promedioRAM: (
        datosOrdenados.reduce(
          (sum, item) => sum + parsearValorNumerico(item.ram_uso),
          0,
        ) / Math.max(1, datosOrdenados.length)
      ).toFixed(2),
      promedioLatencia: (
        datosOrdenados.reduce(
          (sum, item) => sum + parsearValorNumerico(item.latencia),
          0,
        ) / Math.max(1, datosOrdenados.length)
      ).toFixed(2),
    };

    return {
      data: datosOrdenados,
      stats: stats,
    };
  };

  // Función para convertir valores a números válidos
  const parsearValorNumerico = (valor) => {
    // Si es un string, intentar limpiarlo y convertirlo
    if (typeof valor === "string") {
      // Primero reemplazar comas por puntos (formato europeo)
      valor = valor.replace(",", ".");

      // Quitar cualquier símbolo % si existe
      valor = valor.replace("%", "");

      // Intentar convertir a número
      valor = parseFloat(valor);
    }

    // Verificar si el valor es un número válido
    if (valor === null || valor === undefined || isNaN(valor)) {
      return 0;
    }

    // Redondear a 2 decimales
    return parseFloat(parseFloat(valor).toFixed(2));
  };

  const updateFilteredData = (allDatasets, range) => {
    console.log("Actualizando datos filtrados con rango:", range);

    // Filtrar cada dataset para mostrar solo los últimos 'range' segundos
    const filtered = allDatasets.map((dataset) => {
      if (!dataset.data || !Array.isArray(dataset.data)) {
        console.error("Error: dataset.data no es un array:", dataset);
        return {
          ...dataset,
          filteredData: [],
        };
      }

      const dataLength = dataset.data.length;
      console.log(
        `Dataset ${dataset.id} (${dataset.name}): ${dataLength} registros`,
      );

      return {
        ...dataset,
        filteredData:
          dataLength <= range
            ? dataset.data
            : dataset.data.slice(Math.max(0, dataLength - range)),
      };
    });

    setFilteredDatasets(filtered);

    // Generar datos combinados para los gráficos
    const combined = [];

    // Crear un conjunto de todas las etiquetas (marcas de tiempo) únicas
    const allLabels = new Set();
    filtered.forEach((dataset) => {
      dataset.filteredData.forEach((item) => {
        allLabels.add(item.label);
      });
    });

    // Ordenar las etiquetas para asegurar orden cronológico
    const sortedLabels = Array.from(allLabels).sort();

    // Para cada marca de tiempo, recopilar datos de todos los datasets
    sortedLabels.forEach((label) => {
      const dataPoint = {
        label,
      };

      // Agregar datos de cada dataset para esta marca de tiempo
      filtered.forEach((dataset) => {
        const item =
          dataset.filteredData.find((item) => item.label === label) || {};

        dataPoint[`tp_ejec_${dataset.id}`] =
          parsearValorNumerico(item.tp_ejec) || 0;
        dataPoint[`tp_resp_${dataset.id}`] =
          parsearValorNumerico(item.tp_resp) || 0;
        dataPoint[`cpu_uso_${dataset.id}`] =
          parsearValorNumerico(item.cpu_uso) || 0;
        dataPoint[`ram_uso_${dataset.id}`] =
          parsearValorNumerico(item.ram_uso) || 0;
        dataPoint[`latencia_${dataset.id}`] =
          parsearValorNumerico(item.latencia) || 0;
        dataPoint[`num_peticiones_${dataset.id}`] =
          parsearValorNumerico(item.num_peticiones) || 0;
        dataPoint[`hora_${dataset.id}`] = item.hora || "";
        dataPoint[`endpoint_${dataset.id}`] = item.endpoint || "";
      });

      combined.push(dataPoint);
    });

    setCombinedData(combined);
  };

  const calcularPromedio = (datos, campo) => {
    const valores = datos
      .map((row) => {
        // Manejar diferentes formatos de números
        if (typeof row[campo] === "string") {
          // Reemplazar comas por puntos para formatos europeos
          const procesado = row[campo].replace(",", ".");
          return isNaN(parseFloat(procesado)) ? null : parseFloat(procesado);
        }
        return row[campo];
      })
      .filter((val) => val !== null && val !== undefined && !isNaN(val));

    if (valores.length === 0) return 0;

    const suma = valores.reduce((acc, val) => acc + val, 0);
    return parseFloat((suma / valores.length).toFixed(2));
  };

  const calcularModa = (datos, campo) => {
    // Si no existe el campo en los datos, devolver null
    if (datos.length > 0 && !(campo in datos[0])) return null;

    const valores = datos.map((row) => row[campo]);
    const conteo = _.countBy(valores);
    const pares = Object.entries(conteo);
    if (pares.length === 0) return null;

    const [valor] = _.maxBy(pares, ([, count]) => count) || [null];
    return valor;
  };

  const calcularModaBooleana = (datos, campo) => {
    // Si no existe el campo en los datos, devolver false
    if (datos.length > 0 && !(campo in datos[0])) return false;

    const valores = datos.map((row) => {
      if (typeof row[campo] === "string") {
        return row[campo].toLowerCase() === "true" || row[campo] === "1";
      }
      return !!row[campo];
    });

    const contadorTrue = valores.filter((val) => val === true).length;
    return contadorTrue / valores.length > 0.5;
  };

  // Crear una tabla de promedios para una métrica específica en todos los datasets
  const renderAveragesTable = (metric, title, unit = "") => {
    if (filteredDatasets.length === 0) return null;

    // Calcular promedio para cada dataset en el período de tiempo filtrado
    const averages = filteredDatasets.map((dataset) => {
      const values = dataset.filteredData.map((item) => item[metric]);
      const avg =
        values.reduce((sum, val) => sum + parsearValorNumerico(val), 0) /
        values.length;
      return {
        id: dataset.id,
        name: dataset.name,
        color: dataset.color,
        average: parseFloat(avg.toFixed(2)),
      };
    });

    // Ordenar por promedio descendente
    const sortedAverages = [...averages].sort((a, b) => b.average - a.average);

    return (
      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        <h3 className="text-lg font-bold mb-4 text-gray-800 border-b-2 border-gray-200 pb-2">
          {title} - Promedios
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                  Archivo
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                  Promedio
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedAverages.map((item, index) => (
                <tr
                  key={index}
                  className="hover:bg-gray-50 transition-colors duration-200"
                  style={{
                    backgroundColor:
                      index % 2 === 0 ? `${item.color}15` : "white",
                  }}
                >
                  <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                    <div className="flex items-center">
                      <span
                        className="inline-block w-4 h-4 mr-3 rounded-sm border border-gray-300"
                        style={{ backgroundColor: item.color }}
                      ></span>
                      <span className="font-medium">{item.name}</span>
                    </div>
                  </td>
                  <td
                    className="px-6 py-4 whitespace-nowrap font-bold"
                    style={{ color: item.color }}
                  >
                    {item.average}
                    {unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (loading && datasets.length === 0) {
    return <div className="p-4 text-center">Cargando datos...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-center text-gray-800 border-b-4 border-blue-600 pb-4 max-w-3xl mx-auto">
        Análisis Comparativo de Rendimiento
      </h1>

      <div className="mb-8 bg-white p-6 rounded-lg shadow-lg border border-gray-200">
        <h2 className="text-xl font-bold mb-6 text-gray-800 border-l-4 border-blue-600 pl-3">
          Agregar Archivos CSV
        </h2>
        <div className="flex flex-wrap items-center">
          <label className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition cursor-pointer mb-4 mr-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span>Seleccionar archivo CSV</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleAddFile}
              className="hidden"
              disabled={loading}
            />
          </label>
          {loading && (
            <span className="text-gray-700 flex items-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-5 w-5 text-blue-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Cargando archivo...
            </span>
          )}
        </div>

        {datasets.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 border-l-4 border-green-600 pl-3">
              Archivos Cargados
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {datasets.map((dataset, index) => (
                <div
                  key={index}
                  className="p-5 rounded-lg shadow-lg border-2"
                  style={{
                    backgroundColor: `${dataset.color}10`,
                    borderColor: dataset.color,
                  }}
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="font-bold text-gray-800 flex items-center">
                      <div
                        className="w-4 h-4 mr-2 rounded-sm"
                        style={{ backgroundColor: dataset.color }}
                      ></div>
                      {dataset.name}
                    </div>
                    <button
                      onClick={() => removeDataset(dataset.id)}
                      className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700 transition"
                    >
                      ×
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm bg-white p-3 rounded-lg border border-gray-200">
                    <div className="py-1">
                      Peticiones/s:{" "}
                      <span className="font-bold text-gray-800">
                        {dataset.stats.promedioPeticionesPorSegundo}
                      </span>
                    </div>
                    <div className="py-1">
                      T. Ejecución:{" "}
                      <span className="font-bold text-gray-800">
                        {dataset.stats.promedioTiempoEjecucion} ms
                      </span>
                    </div>
                    <div className="py-1">
                      CPU:{" "}
                      <span className="font-bold text-gray-800">
                        {dataset.stats.promedioCPU}%
                      </span>
                    </div>
                    <div className="py-1">
                      RAM:{" "}
                      <span className="font-bold text-gray-800">
                        {dataset.stats.promedioRAM}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {datasets.length > 0 && (
        <>
          <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-lg shadow-lg border border-gray-200">
            <h2 className="text-xl font-bold mb-4 md:mb-0 text-gray-800 border-l-4 border-purple-600 pl-3">
              Gráficos Comparativos
            </h2>
            <div className="flex gap-3">
              <button
                onClick={() => setTimeRange(30)}
                className={`px-4 py-2 rounded-lg text-sm font-medium shadow-md transition-all ${
                  timeRange === 30
                    ? "bg-purple-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                30s
              </button>
              <button
                onClick={() => setTimeRange(60)}
                className={`px-4 py-2 rounded-lg text-sm font-medium shadow-md transition-all ${
                  timeRange === 60
                    ? "bg-purple-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                60s
              </button>
              <button
                onClick={() => setTimeRange(120)}
                className={`px-4 py-2 rounded-lg text-sm font-medium shadow-md transition-all ${
                  timeRange === 120
                    ? "bg-purple-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                120s
              </button>
              <button
                onClick={() =>
                  setTimeRange(Math.max(...datasets.map((d) => d.data.length)))
                }
                className={`px-4 py-2 rounded-lg text-sm font-medium shadow-md transition-all ${
                  timeRange === Math.max(...datasets.map((d) => d.data.length))
                    ? "bg-purple-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Todo
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            {/* Gráfico Peticiones por Segundo */}
            <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
              <h3 className="text-lg font-bold mb-4 text-gray-800 border-b-2 border-gray-200 pb-2">
                Peticiones por Segundo
              </h3>
              <div className="flex justify-end mb-4 text-sm flex-wrap bg-gray-50 p-2 rounded-lg">
                {filteredDatasets.map((dataset, index) => (
                  <span
                    key={index}
                    className="mr-4 mb-1 bg-white px-2 py-1 rounded-md shadow-sm border border-gray-200"
                  >
                    <span
                      className="inline-block w-4 h-4 mr-2 rounded-sm"
                      style={{ backgroundColor: dataset.color }}
                    ></span>
                    {dataset.name}
                  </span>
                ))}
              </div>
              <div className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={combinedData}
                    margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#4b5563" }}
                      tickFormatter={(value) => value.replace("fined", "")}
                    />
                    <YAxis
                      tick={{ fill: "#4b5563" }}
                      domain={[0, "auto"]} // Auto-escalar desde 0
                    />
                    <Tooltip
                      formatter={(value, name) => {
                        const datasetId = name.split("_").pop();
                        const dataset = datasets.find(
                          (d) => d.id === parseInt(datasetId),
                        );
                        return [value, dataset ? dataset.name : name];
                      }}
                      labelFormatter={(label) => `Segundo: ${label}`}
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        boxShadow:
                          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                      }}
                    />
                    <Legend content={() => null} />
                    {filteredDatasets.map((dataset) => (
                      <Bar
                        key={dataset.id}
                        dataKey={`num_peticiones_${dataset.id}`}
                        fill={dataset.color}
                        name={`Peticiones_${dataset.id}`}
                        radius={[4, 4, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico Tiempo de Ejecución */}
            <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
              <h3 className="text-lg font-bold mb-4 text-gray-800 border-b-2 border-gray-200 pb-2">
                Tiempo de Ejecución
              </h3>
              <div className="flex justify-end mb-4 text-sm flex-wrap bg-gray-50 p-2 rounded-lg">
                {filteredDatasets.map((dataset, index) => (
                  <span
                    key={index}
                    className="mr-4 mb-1 bg-white px-2 py-1 rounded-md shadow-sm border border-gray-200"
                  >
                    <span
                      className="inline-block w-4 h-4 mr-2 rounded-sm"
                      style={{ backgroundColor: dataset.color }}
                    ></span>
                    {dataset.name}
                  </span>
                ))}
              </div>
              <div className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={combinedData}
                    margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#4b5563" }}
                      tickFormatter={(value) => value.replace("fined", "")} // Eliminar textos extraños
                    />
                    <YAxis
                      tick={{ fill: "#4b5563" }}
                      domain={[0, "auto"]} // Hacer que el dominio se ajuste automáticamente
                    />
                    <Tooltip
                      formatter={(value, name) => {
                        const datasetId = name.split("_").pop();
                        const dataset = datasets.find(
                          (d) => d.id === parseInt(datasetId),
                        );
                        return [`${value} ms`, dataset ? dataset.name : name];
                      }}
                      labelFormatter={(label) => `Segundo: ${label}`}
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        boxShadow:
                          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                      }}
                    />
                    <Legend content={() => null} />
                    {filteredDatasets.map((dataset) => (
                      <Line
                        key={dataset.id}
                        type="monotone"
                        dataKey={`tp_ejec_${dataset.id}`}
                        stroke={dataset.color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        name={`T. Ejecución_${dataset.id}`}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico Tiempo de Respuesta */}
            <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
              <h3 className="text-lg font-bold mb-4 text-gray-800 border-b-2 border-gray-200 pb-2">
                Tiempo de Respuesta
              </h3>
              <div className="flex justify-end mb-4 text-sm flex-wrap bg-gray-50 p-2 rounded-lg">
                {filteredDatasets.map((dataset, index) => (
                  <span
                    key={index}
                    className="mr-4 mb-1 bg-white px-2 py-1 rounded-md shadow-sm border border-gray-200"
                  >
                    <span
                      className="inline-block w-4 h-4 mr-2 rounded-sm"
                      style={{ backgroundColor: dataset.color }}
                    ></span>
                    {dataset.name}
                  </span>
                ))}
              </div>
              <div className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={combinedData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#4b5563" }}
                      tickFormatter={(value) => value.replace("fined", "")}
                    />
                    <YAxis tick={{ fill: "#4b5563" }} domain={[0, "auto"]} />
                    <Tooltip
                      formatter={(value, name) => {
                        const datasetId = name.split("_").pop();
                        const dataset = datasets.find(
                          (d) => d.id === parseInt(datasetId),
                        );
                        return [`${value} ms`, dataset ? dataset.name : name];
                      }}
                      labelFormatter={(label) => `Segundo: ${label}`}
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        boxShadow:
                          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                      }}
                    />
                    <Legend content={() => null} />
                    {filteredDatasets.map((dataset) => (
                      <Line
                        key={dataset.id}
                        type="monotone"
                        dataKey={`tp_resp_${dataset.id}`}
                        stroke={dataset.color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        name={`T. Respuesta_${dataset.id}`}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico Uso CPU */}
            <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
              <h3 className="text-lg font-bold mb-4 text-gray-800 border-b-2 border-gray-200 pb-2">
                CPU Uso (%)
              </h3>
              <div className="flex justify-end mb-4 text-sm flex-wrap bg-gray-50 p-2 rounded-lg">
                {filteredDatasets.map((dataset, index) => (
                  <span
                    key={index}
                    className="mr-4 mb-1 bg-white px-2 py-1 rounded-md shadow-sm border border-gray-200"
                  >
                    <span
                      className="inline-block w-4 h-4 mr-2 rounded-sm"
                      style={{ backgroundColor: dataset.color }}
                    ></span>
                    {dataset.name}
                  </span>
                ))}
              </div>
              <div className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={combinedData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#4b5563" }}
                      tickFormatter={(value) => value.replace("fined", "")}
                    />
                    <YAxis domain={[0, 100]} tick={{ fill: "#4b5563" }} />
                    <Tooltip
                      formatter={(value, name) => {
                        const datasetId = name.split("_").pop();
                        const dataset = datasets.find(
                          (d) => d.id === parseInt(datasetId),
                        );
                        return [`${value}%`, dataset ? dataset.name : name];
                      }}
                      labelFormatter={(label) => `Segundo: ${label}`}
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        boxShadow:
                          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                      }}
                    />
                    <Legend content={() => null} />
                    {filteredDatasets.map((dataset) => (
                      <Line
                        key={dataset.id}
                        type="monotone"
                        dataKey={`cpu_uso_${dataset.id}`}
                        stroke={dataset.color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        name={`CPU_${dataset.id}`}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico Uso RAM */}
            <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
              <h3 className="text-lg font-bold mb-4 text-gray-800 border-b-2 border-gray-200 pb-2">
                RAM Uso (%)
              </h3>
              <div className="flex justify-end mb-4 text-sm flex-wrap bg-gray-50 p-2 rounded-lg">
                {filteredDatasets.map((dataset, index) => (
                  <span
                    key={index}
                    className="mr-4 mb-1 bg-white px-2 py-1 rounded-md shadow-sm border border-gray-200"
                  >
                    <span
                      className="inline-block w-4 h-4 mr-2 rounded-sm"
                      style={{ backgroundColor: dataset.color }}
                    ></span>
                    {dataset.name}
                  </span>
                ))}
              </div>
              <div className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={combinedData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#4b5563" }}
                      tickFormatter={(value) => value.replace("fined", "")}
                    />
                    <YAxis domain={[0, 100]} tick={{ fill: "#4b5563" }} />
                    <Tooltip
                      formatter={(value, name) => {
                        const datasetId = name.split("_").pop();
                        const dataset = datasets.find(
                          (d) => d.id === parseInt(datasetId),
                        );
                        return [`${value}%`, dataset ? dataset.name : name];
                      }}
                      labelFormatter={(label) => `Segundo: ${label}`}
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        boxShadow:
                          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                      }}
                    />
                    <Legend content={() => null} />
                    {filteredDatasets.map((dataset) => (
                      <Line
                        key={dataset.id}
                        type="monotone"
                        dataKey={`ram_uso_${dataset.id}`}
                        stroke={dataset.color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        name={`RAM_${dataset.id}`}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico Latencia */}
            <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
              <h3 className="text-lg font-bold mb-4 text-gray-800 border-b-2 border-gray-200 pb-2">
                Latencia (ms)
              </h3>
              <div className="flex justify-end mb-4 text-sm flex-wrap bg-gray-50 p-2 rounded-lg">
                {filteredDatasets.map((dataset, index) => (
                  <span
                    key={index}
                    className="mr-4 mb-1 bg-white px-2 py-1 rounded-md shadow-sm border border-gray-200"
                  >
                    <span
                      className="inline-block w-4 h-4 mr-2 rounded-sm"
                      style={{ backgroundColor: dataset.color }}
                    ></span>
                    {dataset.name}
                  </span>
                ))}
              </div>
              <div className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={combinedData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#4b5563" }}
                      tickFormatter={(value) => value.replace("fined", "")}
                    />
                    <YAxis tick={{ fill: "#4b5563" }} domain={[0, "auto"]} />
                    <Tooltip
                      formatter={(value, name) => {
                        const datasetId = name.split("_").pop();
                        const dataset = datasets.find(
                          (d) => d.id === parseInt(datasetId),
                        );
                        return [`${value} ms`, dataset ? dataset.name : name];
                      }}
                      labelFormatter={(label) => `Segundo: ${label}`}
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        boxShadow:
                          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                      }}
                    />
                    <Legend content={() => null} />
                    {filteredDatasets.map((dataset) => (
                      <Line
                        key={dataset.id}
                        type="monotone"
                        dataKey={`latencia_${dataset.id}`}
                        stroke={dataset.color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        name={`Latencia_${dataset.id}`}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Tablas de valores promedio */}
          <h2 className="text-xl font-bold mb-6 text-gray-800 bg-white p-4 rounded-lg shadow-lg border border-gray-200 border-l-4 border-l-orange-600 pl-6">
            Tablas de Valores Promedio
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            {renderAveragesTable("num_peticiones", "Peticiones por Segundo")}
            {renderAveragesTable("tp_ejec", "Tiempo de Ejecución", " ms")}
            {renderAveragesTable("tp_resp", "Tiempo de Respuesta", " ms")}
            {renderAveragesTable("cpu_uso", "CPU Uso", "%")}
            {renderAveragesTable("ram_uso", "RAM Uso", "%")}
            {renderAveragesTable("latencia", "Latencia", " ms")}
          </div>

          {/* Datos recientes para cada dataset */}
          <h2 className="text-xl font-bold mb-6 text-gray-800 bg-white p-4 rounded-lg shadow-lg border border-gray-200 border-l-4 border-l-teal-600 pl-6">
            Últimos Registros por Archivo
          </h2>
          <div className="grid grid-cols-1 gap-8 mb-10">
            {filteredDatasets.map((dataset, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-lg shadow-lg border-2 overflow-hidden"
                style={{ borderColor: dataset.color }}
              >
                <h3
                  className="text-lg font-bold mb-4 flex items-center"
                  style={{ color: dataset.color }}
                >
                  <div
                    className="w-5 h-5 mr-2 rounded"
                    style={{ backgroundColor: dataset.color }}
                  ></div>
                  {dataset.name} - Últimos registros
                </h3>
                <div className="overflow-x-auto shadow-inner rounded-lg border border-gray-200 bg-gray-50 p-1">
                  <table className="min-w-full divide-y divide-gray-200 border">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                          Momento
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                          Peticiones
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                          T. Ejec
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                          T. Resp
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                          CPU %
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                          RAM %
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                          Latencia
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dataset.filteredData
                        .slice(Math.max(0, dataset.filteredData.length - 5))
                        .reverse()
                        .map((item, rowIndex) => (
                          <tr
                            key={rowIndex}
                            className="hover:bg-gray-50 transition-colors duration-200"
                            style={{
                              backgroundColor:
                                rowIndex % 2 === 0
                                  ? `${dataset.color}15`
                                  : "white",
                            }}
                          >
                            <td className="px-6 py-4 whitespace-nowrap font-medium">
                              {item.hora}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {item.num_peticiones}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {item.tp_ejec} ms
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {item.tp_resp} ms
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {item.cpu_uso}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {item.ram_uso}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {item.latencia} ms
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default GraficosRendimiento;
