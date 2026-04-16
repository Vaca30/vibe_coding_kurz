from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

CORPUS_PATH = Path(__file__).with_name("knowledge_base.txt")


def require_api_key() -> None:
    if not os.getenv("OPENAI_API_KEY"):
        raise RuntimeError(
            "OPENAI_API_KEY is not set. Add it to your environment or a local .env file."
        )


def load_corpus_chunks() -> list[str]:
    raw_text = CORPUS_PATH.read_text(encoding="utf-8")
    paragraphs = [paragraph.strip() for paragraph in raw_text.split("\n\n") if paragraph.strip()]

    chunks: list[str] = []
    current_chunk: list[str] = []
    current_size = 0

    for paragraph in paragraphs:
        if current_size + len(paragraph) > 320 and current_chunk:
            chunks.append("\n\n".join(current_chunk))
            current_chunk = [paragraph]
            current_size = len(paragraph)
        else:
            current_chunk.append(paragraph)
            current_size += len(paragraph)

    if current_chunk:
        chunks.append("\n\n".join(current_chunk))

    return chunks


def main() -> None:
    load_dotenv()
    require_api_key()

    chunks = load_corpus_chunks()
    embeddings = OpenAIEmbeddings(
        model=os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
    )
    vector_store = InMemoryVectorStore.from_texts(chunks, embedding=embeddings)
    retriever = vector_store.as_retriever()

    question = (
        "A student wants to build a Codex plugin. Which course block should they study "
        "and which required file must the plugin contain?"
    )
    retrieved_docs = retriever.invoke(question)
    selected_docs = retrieved_docs[:2]
    context = "\n\n".join(doc.page_content for doc in selected_docs)

    llm = ChatOpenAI(model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"), temperature=0)
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "Answer only from the supplied context. If the answer is missing, say so.",
            ),
            (
                "human",
                "Question: {question}\n\nContext:\n{context}",
            ),
        ]
    )
    answer = (prompt | llm).invoke({"question": question, "context": context})

    print("=== Retrieved Chunks ===")
    for index, document in enumerate(selected_docs, start=1):
        print(f"[Chunk {index}]")
        print(document.page_content)
        print()

    print("=== Final Answer ===")
    print(answer.content)


if __name__ == "__main__":
    main()
