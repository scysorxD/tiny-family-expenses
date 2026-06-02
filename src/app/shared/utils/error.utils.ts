export function describeError(error: unknown): string {
  if (!error) {
    return 'Something went wrong.';
  }

  const message =
    typeof error === 'string' ? error : ((error as { message?: string }).message ?? '');

  if (message.includes('PERIOD_CLOSED')) {
    return 'This month is already closed. You cannot add expenses.';
  }
  if (message.includes('CATEGORY_IN_USE')) {
    return 'This category has expenses and cannot be deleted. You can deactivate it instead.';
  }
  if (message.includes('NOT_AUTHENTICATED')) {
    return 'You need to sign in to do that.';
  }
  if (message.includes('INVITATION_EXPIRED')) {
    return 'This invitation has expired.';
  }
  if (message.includes('ALREADY_MEMBER')) {
    return 'You are already a member of this room.';
  }
  if (message.includes('NO_ACTIVE_PAYERS')) {
    return 'There are no payers configured for this room.';
  }
  if (message.includes('NOT_ADMIN')) {
    return 'You do not have permission to perform this action.';
  }
  if (message.toLowerCase().includes('duplicate key') || message.includes('23505')) {
    return 'That name already exists.';
  }
  if (message.includes('Invalid login credentials')) {
    return 'Invalid email or password.';
  }

  return message || 'Something went wrong.';
}
