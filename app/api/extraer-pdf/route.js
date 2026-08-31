// Ruta de servidor: recibe la URL pública de un PDF ya subido a Formación
// Continua, descarga el archivo, y extrae el texto de adentro para
// guardarlo junto al contenido (así Evo puede "leerlo" después, sin tener
// que volver a descargar y procesar el PDF en cada pregunta del chat).

export async function POST(request) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return Response.json({ error: "Falta la URL del PDF." }, { status: 400 });
    }

    const pdfRes = await fetch(url);
    if (!pdfRes.ok) {
      return Response.json({ error: `No se pudo descargar el PDF (${pdfRes.status}).` }, { status: 502 });
    }
    const arrayBuffer = await pdfRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Import diferido: pdf-parse hace trabajo pesado al cargar, mejor
    // solo cuando realmente hace falta.
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);

    // Se limita el tamaño guardado para no inflar de más el contexto que
    // luego se le pasa a la IA en cada pregunta (documentos muy largos
    // quedan truncados a sus primeras ~12.000 palabras aprox.).
    const texto = (data.text || "").replace(/\s+/g, " ").trim().slice(0, 60000);

    return Response.json({ texto, paginas: data.numpages || null });
  } catch (err) {
    return Response.json({ error: err.message || "No se pudo leer el contenido del PDF." }, { status: 500 });
  }
}
