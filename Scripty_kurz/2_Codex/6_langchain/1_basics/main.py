from __future__ import annotations

import os

from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI


def require_api_key() -> None:
    if not os.getenv("OPENAI_API_KEY"):
        raise RuntimeError(
            "OPENAI_API_KEY is not set. Add it to your environment or a local .env file."
        )


def build_model() -> ChatOpenAI:
    model_name = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
    return ChatOpenAI(model=model_name, temperature=0)


def main() -> None:
    load_dotenv()
    require_api_key()

    llm = build_model()

    direct_response = llm.invoke(
        "In two short sentences, explain what LangChain is useful for."
    )

    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You teach practical Python workshops. Be concise and concrete.",
            ),
            (
                "human",
                "Give one simple LangChain example for this topic: {topic}",
            ),
        ]
    )
    chain = prompt | llm
    templated_response = chain.invoke({"topic": "prompt templates"})

    print("=== Direct ChatOpenAI Call ===")
    print(direct_response.content)
    print()
    print("=== Prompt Template Invocation ===")
    print(templated_response.content)


if __name__ == "__main__":
    main()
