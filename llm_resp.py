from asyncio import create_task as async_create_task
from asyncio import sleep as async_sleep
from json import dumps, loads
from aiohttp import ClientSession

async def stream_message(llm_session, source_url, full_data, mediator):
    async with llm_session.post(source_url, data=full_data) as llm_post:
        async for llm_msg in llm_post.content:
            await mediator(llm_msg.decode()[:-1])

async def handle(session, ws_conn, llm_data):
    llm_req_template = llm_data["gen"]
    
    target_url = f"http://{llm_data['addr']}:1234/v1/chat/completions"
    ws_keep_alive = True
    while ws_keep_alive:
        if ws_conn.closed: ws_keep_alive = False; return
        async for llm_req in ws_conn:
            try:
                llm_req_clean = loads(llm_req.data)
                if(llm_req_clean["end_chat"]): ws_keep_alive = False
            
                llm_req_template['messages'] = llm_req_clean["messages"]
                template_ready = dumps(llm_req_template).encode("utf-8")
            
                await stream_message(session, target_url, template_ready, ws_conn.send_str)
            except BaseException as err:
                print("Unexpected error:")
                print(err)
                await ws_conn.send_str('{ "message": "ERROR! Unexpected data type received in JSON field." }')