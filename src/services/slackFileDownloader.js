function bestFileName(file) {
  return file?.name || file?.title || file?.id || 'meeting-audio';
}

async function hydrateFileFromSlack({ file, slackClient }) {
  if ((file?.url_private_download || file?.url_private) || !file?.id || !slackClient?.files?.info) {
    return file;
  }

  const result = await slackClient.files.info({ file: file.id });
  return result.file ?? file;
}

export function createSlackFileDownloader({ botToken, fetchImpl = globalThis.fetch, slackClient = null } = {}) {
  if (!botToken) {
    throw new Error('Slack file downloader requires a bot token');
  }

  if (!fetchImpl) {
    throw new Error('Slack file downloader requires fetch');
  }

  async function downloadFile({ file }) {
    const hydratedFile = await hydrateFileFromSlack({ file, slackClient });
    const url = hydratedFile?.url_private_download || hydratedFile?.url_private;
    if (!url) {
      throw new Error('Slack file is missing a private download URL');
    }

    let response;
    try {
      response = await fetchImpl(url, {
        headers: {
          Authorization: `Bearer ${botToken}`
        }
      });
    } catch (error) {
      throw new Error(`Slack file download request failed: ${error.message}`, { cause: error });
    }

    if (!response.ok) {
      throw new Error(`Slack file download failed: ${response.status}`);
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    const mimeType = hydratedFile.mimetype || response.headers?.get?.('content-type') || 'application/octet-stream';

    return {
      bytes,
      mimeType,
      fileName: bestFileName(hydratedFile)
    };
  }

  return {
    downloadFile
  };
}
