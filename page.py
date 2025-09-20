async def load_page(ref):
    buff_data = open("./public/" + ref, "r")
    page_data = buff_data.read()
    buff_data.close()
    
    return page_data

