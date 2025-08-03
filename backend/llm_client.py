"""
llm_client.py - Unified async interface for Ollama and OpenAI LLMs
"""

import os
import json
from typing import List, Dict, Any, Optional
import httpx
import dotenv

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
LLM_PROVIDER = os.getenv(
    "LLM_PROVIDER", "ollama"
).lower()  # 'ollama' (default) or 'openai'
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
MODEL_NAME = "llama3.2:3b"  # Default model, can be overridden in chat_completion

# For OpenAI fallback
try:
    import openai
except ImportError:
    openai = None


class LLMClient:
    def __init__(self, provider: Optional[str] = None):
        self.provider = (provider or LLM_PROVIDER).lower()
        self.ollama_host = OLLAMA_HOST.rstrip("/")
        self.openai_api_key = OPENAI_API_KEY
        if self.provider == "openai" and openai is not None:
            self.openai_client = openai.AsyncOpenAI(api_key=self.openai_api_key)
        else:
            self.openai_client = None

    async def chat_completion(
        self, messages: List[Dict[str, str]], model: str = MODEL_NAME, **kwargs
    ) -> str:
        """
        Unified chat completion interface. messages: [{role: 'system'|'user'|'assistant', content: str}]
        Returns: response string
        """
        if self.provider == "ollama":
            return await self._ollama_chat(messages, model, **kwargs)
        elif self.provider == "openai" and self.openai_client is not None:
            return await self._openai_chat(messages, model, **kwargs)
        else:
            # fallback to Ollama
            return await self._ollama_chat(messages, model, **kwargs)

    async def _ollama_chat(
        self, messages: List[Dict[str, str]], model: str, **kwargs
    ) -> str:
        # Ollama API expects messages in OpenAI format
        url = f"{self.ollama_host}/v1/chat/completions"
        payload = {
            "model": model,
            "messages": messages,
            "stream": False,
        }
        # Add extra params if needed
        payload.update(
            {k: v for k, v in kwargs.items() if k in ["temperature", "max_tokens"]}
        )
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, timeout=60)
            resp.raise_for_status()
            data = resp.json()
            # Ollama returns choices[0].message.content like OpenAI
            return data["choices"][0]["message"]["content"]

    async def _openai_chat(
        self, messages: List[Dict[str, str]], model: str, **kwargs
    ) -> str:
        response = await self.openai_client.chat.completions.create(
            model=model,
            messages=messages,
            **{k: v for k, v in kwargs.items() if k in ["temperature", "max_tokens"]},
        )
        return response.choices[0].message.content
