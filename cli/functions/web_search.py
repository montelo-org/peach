import json
import os

from serpapi import GoogleSearch
from tavily import TavilyClient

tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))


def web_search_serp(*, query, index):
    search = GoogleSearch(
        {
            "q": query,
            "location": "toronto, ontario, canada",
            "api_key": os.getenv("SERP_API_KEY"),
        }
    )
    results = search.get_dict()
    result = results.get(index, None)

    if result is None:
        return results

    if index == "sports_results":
        return json.dumps(result)

    # organic
    return "\n\n".join([r["snippet"] for r in result])


def web_search_tavily(*, query):
    return tavily.qna_search(query=query)
