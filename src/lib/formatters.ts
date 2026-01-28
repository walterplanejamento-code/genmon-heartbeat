/**
 * Formata o horímetro no formato padrão do visor do gerador: HHHHH:MM:SS
 * Exemplo: 00285:30:15 (285 horas, 30 minutos, 15 segundos)
 */
export function formatHorimetro(
  horas: number,
  minutos: number,
  segundos: number
): string {
  const h = String(Math.floor(horas)).padStart(5, '0');
  const m = String(Math.floor(minutos)).padStart(2, '0');
  const s = String(Math.floor(segundos)).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * Converte horas decimais antigas para o novo formato
 * Útil para fallback quando os campos separados não existem
 */
export function horasDecimaisParaFormato(horasDecimais: number): string {
  const totalSegundos = Math.floor(horasDecimais * 3600);
  const horas = Math.floor(totalSegundos / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;
  return formatHorimetro(horas, minutos, segundos);
}
