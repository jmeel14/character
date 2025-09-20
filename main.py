from aiohttp import web, ClientSession
from json import loads, dumps
from random import random


import page
import llm_resp

PAGE_DICT = {
    '': { 'type': 'text/html', 'body': "main.html" },
    'style.css': { 'type': "text/css", 'body': "style/main.css" },
    'script.js': { 'type': "text/javascript", 'body': "script/main.js" },
    'notices.js':{ 'type': "text/javascript", 'body': "script/notices.js" },
    'wsConn.js': { 'type': "text/javascript", 'body': "script/ws.js" }
}

LLM_DEFS = {
    'addr': input("Insert IP address of llm server: ") or "localhost",
    'gen': {
        'model': input("Insert llm name: "), 'stream': True,
        'max_tokens': input("Max tokens: ") or 512, 'top_k': input("Vocabulary: ") or 8,
        'temperature': input("Temperature: ") or 1.7
    }
}

if LLM_DEFS['gen']["model"] == "q": LLM_DEFS['gen']["model"] = "qwen3-4b-instruct-2507"

def clean_url(ref):
    return ref.split('/')

async def initialize(host_app):
    host_app["client_session"] = ClientSession(headers={ 'Content-Type': "application/json" })
    host_app["websockets"] = {}
    host_app["llm_data"] = LLM_DEFS
async def terminate_session(host_app):
    await host_app["client_session"].close()

async def null_resp(req):
    body_resp = web.Response(status=204, reason="Item Does Not Exist")
    await body_resp.prepare(req)
    await body_resp.write(b"")
    return body_resp

async def page_body(req):
    target_ref = clean_url(req.path)
    body_resp_pre = web.StreamResponse(status=200, reason="OK")
    body_resp_pre.content_type = PAGE_DICT[target_ref[1]]["type"]
    await body_resp_pre.prepare(req)
    resp_body = await page.load_page(PAGE_DICT[target_ref[1]]["body"])
    await body_resp_pre.write(resp_body.encode("utf-8"))
    return body_resp_pre

async def llm_stream(req):
    chunk_resp = web.WebSocketResponse()
    await chunk_resp.prepare(req)
    
    resp_data = await llm_resp.handle(
        req.app["client_session"],
        chunk_resp,
        req.app["llm_data"]
    )
    return chunk_resp

RUN_APP = web.Application()

RUN_APP.on_startup.append(initialize)
RUN_APP.on_shutdown.append(terminate_session)

RUN_APP.add_routes([
    web.get('/', page_body),
    web.get('/style.css', page_body),
    web.get('/script.js', page_body),
    web.get('/notices.js', page_body),
    web.get('/wsConn.js', page_body),
    web.get('/llm', llm_stream),
    web.get('/favicon.ico', null_resp)
])

web.run_app(RUN_APP)