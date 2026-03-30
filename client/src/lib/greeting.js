export const getGreetingByTime = (date = new Date()) => {
  const hours = date.getHours();

  if (hours < 12) {
    return "Good Morning";
  }

  if (hours < 17) {
    return "Good Afternoon";
  }

  return "Good Evening";
};
