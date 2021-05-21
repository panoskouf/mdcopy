type mode = 'url' | 'org-mode' | 'markdown' | 'custom';

interface state {
  host: string;
  href: string;
  title: () => string;
}

const __chrome_extension_mdcopy = (callback) => {
  if (document.readyState != 'loading') callback();
  else document.addEventListener('DOMContentLoaded', callback);
};

__chrome_extension_mdcopy(() => {
  // get updated url and title bcz SPAs
  function state(): state {
    const { host, href } = location;
    const title = () => document.title;
    return { href, host, title };
  }

  // some random css prefix
  const p = 'H3xA_';

  const { body } = document;

  // append msg container to body
  let msgContainer = `<div class="${p}msgPopUpCont ${p}hidden"></div><div class="${p}msgPopUpContError ${p}hidden"></div>`;

  body.insertAdjacentHTML(
    'beforeend',
    `<div class="${p}cont">${msgContainer}</div>`
  );

  // ui effects
  function toggleFade(contClass: string) {
    const el: HTMLElement | null = document.querySelector(contClass);
    el?.classList.toggle(`${p}hidden`);
    el?.classList.toggle(`${p}visible`);
  }

  function fadeEffect(contClass: string, ms: number) {
    toggleFade(contClass);
    setTimeout(function () {
      toggleFade(contClass);
    }, ms);
  }

  /* send pop up msg */
  function notifyUser(msg: string, error: boolean = false) {
    const elSelector = error ? `.${p}msgPopUpContError` : `.${p}msgPopUpCont`;
    const el: HTMLElement | null = document.querySelector(elSelector);
    if (el) {
      el.textContent = msg;
      fadeEffect(elSelector, 1000);
    } else {
      alert('unknown error occurred');
      console.error('unknown error occurred');
    }
  }

  /* site specific custom functionality - start */
  function isYouTubeSite(host) {
    return host === 'www.youtube.com' || host === 'music.youtube.com';
  }

  function isYouTubeVideoLink(host, url) {
    return isYouTubeSite(host) && url.search('watch') !== -1;
  }

  // prettier-ignore
  const ytJunk = [
    // check for end of line or space after each one
    ' - YouTube', 'And Lyrics', 'and video', 'lyrics', 'lyric', 'video', 'clip', 'Audio', 'HD', 'Official', 'Unofficial', 'Edit', 'Follow Me', 'Music', 'Deep-House', 'House', 'rap', 'trap', 'pop', 'metal', 'Subtitulada Español', 'song', 'sold', 'free','Tradução', 'Beats', 'beat'
  ]
  const ytJunkRgx = new RegExp(ytJunk.join('|'), 'gi');

  function getRandomEmojis(num: number) {
    const emojis = [...'🎸🎵🎧🤘✨🎹🥁💖🎆🎇🧨🌄📻🍹😎😍🥳🎈🎉⚡🔥🎷🎶'];
    let randomEmoji = () => emojis[Math.floor(Math.random() * emojis.length)];

    let emojiStr = '';
    for (let i = num; i--; ) emojiStr += randomEmoji();

    return emojiStr;
  }

  function siteSpecificFormat(title) {
    const { host, href } = state();

    if (isYouTubeVideoLink(host, href)) {
      // remove junk in song title
      title = title
        .replace(ytJunkRgx, '')
        .replace('feat', 'ft')
        .replace('remix', 'mix')
        .replace(/[\{][\ ]*[\}]/g, '')
        .replace(/[\(][\ ]*[\)]/g, '')
        .trim('');
      /* .replace(/([\ ]*)/g, ' ') */

      title = `${getRandomEmojis(1)} ${title} ${getRandomEmojis(1)}`;
      return { isCustom: true, newTitle: title };
    } else {
      return { isCustom: false, newTitle: title };
    }
  }
  /* site specific custom functionality - end */

  // replace any brackets or parens that might break the format
  function formatTitle(title: string, mode: mode) {
    let newTitle = title;
    if (mode === 'org-mode') {
      newTitle = newTitle.replace('[', '(').replace(']', ')');
    } else if (mode === 'markdown') {
      newTitle = newTitle.replace('[', ' ').replace(']', ' ');
      newTitle = newTitle.replace('(', ' ').replace(')', ' ');
    }

    return newTitle;
  }

  function copyToClipboard(content: string = '', msg: string) {
    try {
      navigator.clipboard.writeText(content).then(() => {
        notifyUser(msg);
      });
    } catch (err) {
      /* Copy to clipboard is available in https protocol only */
      notifyUser('not permitted on http', true);
      console.log('Something went wrong', err);
    }
  }

  function getLink(mode: mode, { href, title, host }: state) {
    if (mode != 'custom') {
      let formattedTitle = formatTitle(title(), mode);

      let msgToUser = 'url copied';
      let toClipboard = '';
      if (mode === 'org-mode') {
        toClipboard = `[[${href}][${formattedTitle}]]`;
        msgToUser = 'org-link copied';
      } else if (mode === 'markdown') {
        toClipboard = `[${formattedTitle}](${href})`;
        msgToUser = 'markdown-link copied';
      }
      copyToClipboard(toClipboard, msgToUser);
    } else {
      const { isCustom, newTitle } = siteSpecificFormat(title());
      let msgToUser = !isCustom ? 'title & url copied' : '✨ copied ✨';

      let url = !isYouTubeVideoLink(host, href) ? href : href.split('&')[0]; // exclude playlist
      let toClipboard = newTitle + '\n\n' + url;

      copyToClipboard(toClipboard, msgToUser);
    }
  }

  /* jobs to run on keybindings */
  chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
    const mode: mode = message.action;
    getLink(mode, state());

    // bg script requires a response
    sendResponse('noop');
  });
});
