// Função serverless da Vercel.
// Busca o CSV publicado do Google Sheets do lado do servidor,
// resolvendo o CORS e mantendo o link fora do código do navegador.
//
// O link de cada cliente fica numa variável de ambiente na Vercel,
// no formato: CSV_<SLUG>  (ex: CSV_KMINERAL)
// O front chama /api/csv?c=kmineral e recebe o CSV.

export default async function handler(req, res) {
  const c = (req.query.c || '').toString().toUpperCase().replace(/[^A-Z0-9_]/g, '');
  if (!c) {
    res.status(400).json({ error: 'cliente não informado' });
    return;
  }

  const url = process.env['CSV_' + c];
  if (!url) {
    res.status(404).json({ error: 'cliente não configurado: ' + c });
    return;
  }

  try {
    const r = await fetch(url, { redirect: 'follow' });
    if (!r.ok) throw new Error('upstream ' + r.status);
    const text = await r.text();
    // cache de 1h no edge — os dados mudam 1x/dia, então isso é folgado
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(text);
  } catch (e) {
    res.status(502).json({ error: 'falha ao buscar planilha', detail: String(e) });
  }
}
