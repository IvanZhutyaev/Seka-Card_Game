import hashlib
import hmac
import logging
from urllib.parse import parse_qsl

logger = logging.getLogger(__name__)

def verify_telegram_data(init_data: str, bot_token: str) -> bool:
    """
    Verifies the authenticity of data received from a Telegram Mini App.

    Args:
        init_data: The raw initData string from Telegram.
        bot_token: Your Telegram bot token.

    Returns:
        True if the data is authentic, False otherwise.
    """
    try:
        parsed_data = dict(parse_qsl(init_data))
        received_hash = parsed_data.pop('hash', None)

        if not received_hash:
            logger.error("Hash not found in initData")
            return False

        # The data is sorted by key and formatted as 'key=value' pairs,
        # separated by a newline character.
        data_check_string = "\n".join(
            f"{k}={v}" for k, v in sorted(parsed_data.items())
        )

        # The secret key is the HMAC-SHA256 hash of the string "WebAppData"
        # using the bot token as the key.
        secret_key = hmac.new(
            "WebAppData".encode(), bot_token.encode(), hashlib.sha256
        ).digest()

        # The calculated hash is the HMAC-SHA256 hash of the data_check_string
        # using the secret_key.
        calculated_hash = hmac.new(
            secret_key, data_check_string.encode(), hashlib.sha256
        ).hexdigest()

        # For debugging purposes
        logger.debug(f"Received hash: {received_hash}")
        logger.debug(f"Calculated hash: {calculated_hash}")

        return calculated_hash == received_hash
    except Exception as e:
        logger.error(f"Telegram data verification failed: {e}", exc_info=True)
        return False 