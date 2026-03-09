from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Anthropic
    anthropic_api_key: str = ""

    # Zendesk
    zendesk_subdomain: str = ""
    zendesk_email: str = ""
    zendesk_api_token: str = ""

    # Email
    email_imap_host: str = "imap.gmail.com"
    email_imap_port: int = 993
    email_smtp_host: str = "smtp.gmail.com"
    email_smtp_port: int = 587
    email_address: str = ""
    email_password: str = ""

    # Portal / Tribexa
    tribexa_api_url: str = ""
    tribexa_api_key: str = ""

    # App
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    log_level: str = "INFO"

    # Escalation
    escalation_email: str = ""


settings = Settings()
