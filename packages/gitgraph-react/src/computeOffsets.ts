import { Orientation } from "@gitgraph/core";

export const computeOffsets = (
  commits: Element[],
  orientation: Orientation,
): { [key: number]: number } => {
  let totalOffsetY = 0;

  // In VerticalReverse orientation, commits are in the same order in the DOM.
  const orientedCommits =
    orientation === Orientation.VerticalReverse ? commits : commits.reverse();

  return orientedCommits.reduce<{ [key: number]: number }>(
    (newOffsets, commit) => {
      const commitY = parseInt(
        commit
          .getAttribute("transform")!
          .split(",")[1]
          .slice(0, -1),
        10,
      );

      const firstForeignObject = commit.getElementsByTagName(
        "foreignObject",
      )[0];
      const customHtmlMessage =
        firstForeignObject && firstForeignObject.firstElementChild;

      let messageHeight = 0;
      if (customHtmlMessage) {
        const height = customHtmlMessage.getBoundingClientRect().height;
        const marginTopInPx =
          window.getComputedStyle(customHtmlMessage).marginTop || "0px";
        const marginTop = parseInt(marginTopInPx.replace("px", ""), 10);

        messageHeight = height + marginTop;
      }

      // Force the height of the foreignObject (browser issue)
      if (firstForeignObject) {
        firstForeignObject.setAttribute("height", `${messageHeight}px`);
      }

      newOffsets[commitY] = commitY + totalOffsetY;

      // Increment total offset after setting the offset
      // => offset next commits accordingly.
      totalOffsetY += messageHeight;

      return newOffsets;
    },
    {},
  );
};
