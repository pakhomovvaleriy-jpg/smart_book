import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});


export async function requestNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleTaskReminder(
  taskTitle: string,
  fireDate: Date,
  taskId: number,
): Promise<string | null> {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Напоминание о задаче',
        body: taskTitle,
        data: { taskId },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
    });
    return id;
  } catch (e) {
    console.warn('scheduleTaskReminder error:', e);
    return null;
  }
}

export async function cancelTaskReminder(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch { }
}
