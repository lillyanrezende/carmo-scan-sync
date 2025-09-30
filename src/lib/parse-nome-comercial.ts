// Função para fazer o parse do campo "Nome Comercial" do código de barras
// Formato: Categoria - Subcategoria - Nome - Design - Cor - Tamanho - Sola - Tipo de pele - Forma de Sapatos - Tipo de Construção - Armazém

interface ParsedNomeComercial {
  categoria: string | null;
  subcategoria: string | null;
  nome: string | null;
  design: string | null;
  cor: string | null;
  tamanho: string | null;
  sola: string | null;
  tipo_pele: string | null;
  forma_sapatos: string | null;
  tipo_construcao: string | null;
  armazem: string | null;
}

export function parseNomeComercial(nomeComercial: string): ParsedNomeComercial {
  if (!nomeComercial) {
    return {
      categoria: null,
      subcategoria: null,
      nome: null,
      design: null,
      cor: null,
      tamanho: null,
      sola: null,
      tipo_pele: null,
      forma_sapatos: null,
      tipo_construcao: null,
      armazem: null,
    };
  }

  // Split por " - " (espaço-hífen-espaço)
  const parts = nomeComercial.split(' - ').map(p => p.trim());

  // Converter "Null" para null
  const cleanValue = (value: string | undefined): string | null => {
    if (!value || value === '' || value.toLowerCase() === 'null') {
      return null;
    }
    return value;
  };

  return {
    categoria: cleanValue(parts[0]),
    subcategoria: cleanValue(parts[1]),
    nome: cleanValue(parts[2]),
    design: cleanValue(parts[3]),
    cor: cleanValue(parts[4]),
    tamanho: cleanValue(parts[5]),
    sola: cleanValue(parts[6]),
    tipo_pele: cleanValue(parts[7]),
    forma_sapatos: cleanValue(parts[8]),
    tipo_construcao: cleanValue(parts[9]),
    armazem: cleanValue(parts[10]),
  };
}
