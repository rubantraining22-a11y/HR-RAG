import { ChatOpenAI } from '@langchain/openai';
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { chromaService } from './chromaService.js';

class AutomobileHRRAGPipeline {
  constructor() {
    this.llm = null;
  }

  getLLM() {
    const apiKey = process.env.OPENAI_API_KEY;
    const modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured in environment variables.');
    }

    if (!this.llm) {
      this.llm = new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: modelName,
        temperature: 0.1, // Low temperature for high factual accuracy and strict grounding
      });
    }
    return this.llm;
  }

  /**
   * Rephrase conversational follow-up questions if chat history exists
   */
  async contextualizeQuestion(question, chatHistory = []) {
    if (!chatHistory || chatHistory.length === 0) {
      return question;
    }

    try {
      const llm = this.getLLM();
      const rephrasePrompt = ChatPromptTemplate.fromMessages([
        [
          'system',
          `Given a chat history and the latest user question which might reference context in the chat history, formulate a standalone question which can be understood without the chat history. Do NOT answer the question, just reformulate it if needed and otherwise return it as is.`,
        ],
        new MessagesPlaceholder('chat_history'),
        ['human', '{input}'],
      ]);

      const formattedMessages = await rephrasePrompt.formatMessages({
        chat_history: chatHistory.map((m) =>
          m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
        ),
        input: question,
      });

      const response = await llm.invoke(formattedMessages);
      return response.content?.trim() || question;
    } catch (err) {
      console.warn('[RAGPipeline] Contextualize question fallback to original:', err.message);
      return question;
    }
  }

  /**
   * Main Query Handler with Strict Automobile HR Guardrails
   */
  async query({ question, chatHistory = [], topK = 4, similarityThreshold = 0.25 }) {
    if (!question || typeof question !== 'string') {
      throw new Error('Question must be a valid non-empty string.');
    }

    const llm = this.getLLM();

    // 1. Contextualize question with chat history
    const standaloneQuery = await this.contextualizeQuestion(question, chatHistory);
    console.log(`[RAGPipeline] Standalone Query: "${standaloneQuery}"`);

    // 2. Retrieve relevant chunks from ChromaDB
    const retrievedChunks = await chromaService.similaritySearch(standaloneQuery, topK);
    console.log(`[RAGPipeline] Retrieved ${retrievedChunks.length} chunks from ChromaDB.`);

    // 3. Filter by similarity threshold
    const relevantChunks = retrievedChunks.filter(
      (chunk) => chunk.similarity >= similarityThreshold
    );

    // If no chunks found or knowledge base is completely empty
    if (relevantChunks.length === 0) {
      return {
        answer:
          "I am the **Automobile HR Assistant** and I am strictly configured to answer questions based solely on the official Automobile HR policy documents in our knowledge base.\n\nI could not find any relevant information regarding your question in the uploaded HR policy documentation. Please upload the relevant HR policy document or rephrase your question regarding dealership guidelines, assembly shift schedules, overtime rules, leave entitlements, or technician safety SOPs.",
        citations: [],
        standaloneQuery,
        grounded: false,
      };
    }

    // 4. Format context for prompt
    const contextText = relevantChunks
      .map((chunk, idx) => {
        const source = chunk.metadata.source || 'Automobile HR Document';
        const chunkIndex = chunk.metadata.chunkIndex ?? idx;
        return `--- DOCUMENT CHUNK [${idx + 1}] (Source: ${source}, Chunk: #${chunkIndex}, Match: ${(chunk.similarity * 100).toFixed(1)}%) ---\n${chunk.pageContent}\n`;
      })
      .join('\n');

    // 5. Strict Automobile HR Guardrail Prompt
    const systemPrompt = `You are the dedicated, highly professional **Automobile HR Assistant** for our automotive organization.
Your primary role and sole responsibility is to provide accurate, strictly grounded human resources information based EXCLUSIVELY on the provided Automobile HR documentation.

CRITICAL INSTRUCTIONS & STRICT GUARDRAILS:
1. **Absolute Grounding**: You MUST answer the user's question USING ONLY the facts and policies explicitly mentioned in the CONTEXT below.
2. **Strict Out-of-Domain Refusal**: If the question asks about general knowledge, topics unrelated to the provided HR documentation (e.g., general world trivia, programming, cooking, unrelated news), or if the answer is NOT present in the CONTEXT, you MUST REFUSE politely and state:
   "I am the Automobile HR Assistant and I am strictly restricted to answering questions related to the official Automobile HR policy documents provided in our knowledge base. The requested information is not available in the uploaded documentation."
3. **No Speculation or Hallucination**: Do not assume, invent, or extrapolate policies, allowances, numbers, or rules not written in the context.
4. **Automotive HR Tone**: Maintain a clear, professional, supportive, and authoritative HR tone tailored for assembly technicians, dealership staff, supervisors, and automotive engineers. Do not use emojis in your response.
5. **Citations & Clarity**: When citing rules, specify the exact policy/document name, section, and allowances clearly. Use bullet points and markdown bolding for clarity.

CONTEXT DOCUMENTS:
${contextText}`;

    const prompt = ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(systemPrompt),
      new MessagesPlaceholder('chat_history'),
      HumanMessagePromptTemplate.fromTemplate('{question}'),
    ]);

    const historyMessages = (chatHistory || []).map((m) =>
      m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
    );

    const formattedMessages = await prompt.formatMessages({
      chat_history: historyMessages,
      question: question,
    });

    const response = await llm.invoke(formattedMessages);
    const answer = response.content || '';

    // 6. Build structured citations
    const citations = relevantChunks.map((chunk, idx) => ({
      id: idx + 1,
      source: chunk.metadata.source || 'HR Policy Document',
      title: chunk.metadata.title || chunk.metadata.source || 'Automobile HR Policy',
      docType: chunk.metadata.docType || 'txt',
      chunkIndex: chunk.metadata.chunkIndex ?? idx,
      similarity: chunk.similarity,
      similarityPercentage: `${(chunk.similarity * 100).toFixed(1)}%`,
      excerpt: chunk.pageContent.slice(0, 220) + (chunk.pageContent.length > 220 ? '...' : ''),
      fullText: chunk.pageContent,
    }));

    return {
      answer,
      citations,
      standaloneQuery,
      grounded: true,
      modelUsed: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    };
  }
}

export const ragPipeline = new AutomobileHRRAGPipeline();
