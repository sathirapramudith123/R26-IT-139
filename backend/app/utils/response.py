def success_response(data=None, message: str = "Success"):
    return {"success": True, "message": message, "data": data}

def error_response(message: str = "Error"):
    return {"success": False, "message": message}
