export default function handleAxiosError(e, fallbackMessage) {
  console.error(`${fallbackMessage}: `, e.stack);

  // Server responded with status != 2xx
  if (e.response)
    return { error: e.response.data?.message || fallbackMessage };

  // Request made but no response
  if (e.request)
    return { error: "No response from server!" };

  // Something else (network error, setup error, etc.)
  return { error: "Oops! Something went wrong!" };
}