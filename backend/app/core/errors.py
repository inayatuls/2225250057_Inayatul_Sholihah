from fastapi import HTTPException


class AppError(HTTPException):
    """Error API berformat {"detail": {"code": ..., "message": ...}}."""

    def __init__(self, status: int, code: str, message: str) -> None:
        super().__init__(status_code=status, detail={"code": code, "message": message})


def not_found(message: str = "Data tidak ditemukan.", code: str = "NOT_FOUND") -> AppError:
    return AppError(404, code, message)


def forbidden(code: str = "FORBIDDEN_ROLE", message: str = "Kamu tidak punya akses ke halaman ini.") -> AppError:
    return AppError(403, code, message)


def conflict(code: str, message: str) -> AppError:
    return AppError(409, code, message)


def bad_request(code: str, message: str) -> AppError:
    return AppError(400, code, message)
