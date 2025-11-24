/**
 * AI Classifier Service for Voz.Local Pipeline.
 * 
 * Uses OpenAI's GPT-4 and embeddings to classify citizen proposals
 * by theme and detect similar proposals.
 * 
 * Migrated from Python to TypeScript.
 */

import OpenAI from 'openai';

// Define valid themes for classification
export const TEMAS = [
  'Saúde',
  'Educação',
  'Transporte',
  'Segurança',
  'Meio Ambiente',
  'Habitação',
  'Cultura',
  'Esporte',
  'Assistência Social',
  'Infraestrutura',
  'Outros',
] as const;

export type Tema = typeof TEMAS[number];

export interface ClassificationResult {
  temaPrincipal: Tema;
  temasSecundarios: Tema[];
  confidenceScore: number;
  needsReview: boolean;
}

export interface SimilarityResult {
  propostaId: number;
  similarityScore: number;
  conteudo: string;
}

export class AIClassifier {
  private client: OpenAI;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({ apiKey: key });
    console.log('AIClassifier initialized');
  }

  /**
   * Classify the theme of a citizen proposal using GPT-4.
   */
  async classifyTheme(conteudo: string): Promise<ClassificationResult> {
    try {
      const prompt = `
Você é um classificador de propostas cidadãs para um sistema de participação legislativa.

Analise a seguinte proposta e classifique-a em um ou mais dos seguintes temas:
${TEMAS.join(', ')}

PROPOSTA:
"${conteudo}"

Responda APENAS no formato JSON:
{
  "tema_principal": "...",
  "temas_secundarios": ["...", "..."],
  "confidence_score": 0.95,
  "reasoning": "..."
}

Regras:
- tema_principal: o tema mais relevante (obrigatório)
- temas_secundarios: lista de temas secundários (pode ser vazia)
- confidence_score: número entre 0.0 e 1.0
- reasoning: justificativa breve
`;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Parse JSON response
      const result = JSON.parse(content);

      // Validate tema_principal is in TEMAS
      const temaPrincipal = TEMAS.includes(result.tema_principal)
        ? result.tema_principal
        : 'Outros';

      // Filter temas_secundarios to valid ones
      const temasSecundarios = (result.temas_secundarios || []).filter((tema: string) =>
        TEMAS.includes(tema as Tema),
      );

      const confidenceScore = Number(result.confidence_score) || 0.0;
      const needsReview = confidenceScore < 0.7;

      return {
        temaPrincipal: temaPrincipal as Tema,
        temasSecundarios,
        confidenceScore,
        needsReview,
      };
    } catch (error) {
      console.error('Error classifying theme:', error);

      // Fallback to "Outros" if classification fails
      return {
        temaPrincipal: 'Outros',
        temasSecundarios: [],
        confidenceScore: 0.0,
        needsReview: true,
      };
    }
  }

  /**
   * Generate embedding for a text using OpenAI embeddings.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * Calculate cosine similarity between two embeddings.
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    // Using Array.prototype.at() for safe array access
    const dotProduct = vecA.reduce(
      (sum, value, idx) => sum + value * (vecB.at(idx) ?? 0),
      0,
    );
    const magnitudeA = Math.sqrt(vecA.reduce((sum, value) => sum + value * value, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, value) => sum + value * value, 0));

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Find similar proposals by comparing embeddings.
   * 
   * @param currentEmbedding - Embedding of the current proposal
   * @param existingProposals - Array of existing proposals with embeddings
   * @param threshold - Minimum similarity score (0.0 to 1.0)
   * @returns Array of similar proposals sorted by similarity score
   */
  async findSimilarProposals(
    currentEmbedding: number[],
    existingProposals: Array<{ id: number; conteudo: string; embedding: number[] }>,
    threshold = 0.75,
  ): Promise<SimilarityResult[]> {
    try {
      const similarities: SimilarityResult[] = [];

      existingProposals.forEach((proposal) => {
        const similarity = this.cosineSimilarity(currentEmbedding, proposal.embedding);

        if (similarity >= threshold) {
          similarities.push({
            propostaId: proposal.id,
            similarityScore: Number(similarity.toFixed(4)),
            conteudo: proposal.conteudo,
          });
        }
      });

      // Sort by similarity score (descending)
      return similarities.sort((a, b) => b.similarityScore - a.similarityScore);
    } catch (error) {
      console.error('Error finding similar proposals:', error);
      return [];
    }
  }

  /**
   * Batch classify multiple proposals.
   */
  async classifyBatch(conteudos: string[]): Promise<ClassificationResult[]> {
    try {
      const results = await Promise.all(
        conteudos.map((conteudo) => this.classifyTheme(conteudo)),
      );
      return results;
    } catch (error) {
      console.error('Error in batch classification:', error);
      throw new Error('Failed to classify batch');
    }
  }

  /**
   * Extract key topics from a proposal using GPT-4.
   */
  async extractKeyTopics(conteudo: string): Promise<string[]> {
    try {
      const prompt = `
Extraia os 3-5 tópicos-chave principais desta proposta cidadã:

"${conteudo}"

Responda APENAS com uma lista JSON de strings:
["tópico 1", "tópico 2", "tópico 3"]
`;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 200,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return [];
      }

      const topics = JSON.parse(content);
      return Array.isArray(topics) ? topics : [];
    } catch (error) {
      console.error('Error extracting key topics:', error);
      return [];
    }
  }
}

export default AIClassifier;
