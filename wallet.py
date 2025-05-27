from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from models import Player, Transaction
import logging
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

class WalletManager:
    def __init__(self, db: Session):
        self.db = db

    def get_balance(self, telegram_id: int) -> Optional[int]:
        """Получить баланс пользователя"""
        try:
            player = self.db.query(Player).filter(Player.telegram_id == telegram_id).first()
            return player.balance if player else None
        except SQLAlchemyError as e:
            logger.error(f"Error getting balance for user {telegram_id}: {e}")
            return None

    def update_balance(self, telegram_id: int, amount: int, action: str, game_id: Optional[str] = None) -> Tuple[bool, str]:
        """
        Обновить баланс пользователя
        
        Args:
            telegram_id: ID пользователя в Telegram
            amount: Сумма изменения (положительная или отрицательная)
            action: Тип транзакции ('bet', 'win', 'loss', 'fold', 'svara', 'join', 'bluff')
            game_id: ID игры (опционально)
            
        Returns:
            Tuple[bool, str]: (успех операции, сообщение)
        """
        try:
            player = self.db.query(Player).filter(Player.telegram_id == telegram_id).first()
            if not player:
                return False, "Игрок не найден"

            # Проверка достаточности средств для списания
            if amount < 0 and abs(amount) > player.balance:
                return False, "Недостаточно средств"

            # Обновляем баланс
            player.balance += amount

            # Создаем запись о транзакции
            transaction = Transaction(
                player_id=player.id,
                game_id=game_id,
                amount=amount,
                action=action
            )
            self.db.add(transaction)
            self.db.commit()

            return True, f"Баланс успешно обновлен. Новый баланс: {player.balance}"
        except SQLAlchemyError as e:
            self.db.rollback()
            logger.error(f"Error updating balance for user {telegram_id}: {e}")
            return False, "Ошибка при обновлении баланса"

    def get_transaction_history(self, telegram_id: int, limit: int = 10) -> list:
        """Получить историю транзакций пользователя"""
        try:
            player = self.db.query(Player).filter(Player.telegram_id == telegram_id).first()
            if not player:
                return []

            transactions = (
                self.db.query(Transaction)
                .filter(Transaction.player_id == player.id)
                .order_by(Transaction.created_at.desc())
                .limit(limit)
                .all()
            )

            return [
                {
                    "amount": t.amount,
                    "action": t.action,
                    "created_at": t.created_at,
                    "game_id": t.game_id
                }
                for t in transactions
            ]
        except SQLAlchemyError as e:
            logger.error(f"Error getting transaction history for user {telegram_id}: {e}")
            return [] 