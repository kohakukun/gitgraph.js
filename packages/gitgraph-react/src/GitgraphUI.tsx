import {
  arrowSvgPath,
  ArrowSvgPathObject,
  BranchesPaths,
  Commit,
  Coordinate,
  MergeStyle,
  Mode,
  Orientation,
  templateExtend,
  toSvgPath,
} from "@gitgraph/core";
import * as React from "react";
import { BranchLabel } from "./BranchLabel";
import { Dot } from "./Dot";
import { Tag, TAG_PADDING_X } from "./Tag";
import { Tooltip } from "./Tooltip";
import { computeOffsets } from "./computeOffsets";
const { useEffect, useRef, useState } = React;

export type ReactSvgElement = React.ReactElement<SVGElement>;

export { templateExtend, MergeStyle, Mode, Orientation };

export interface GitgraphUIProps {
  arrowSize: number | null;
  arrowColor: string | null;
  arrowOffset: number;
  branchLabelOnEveryCommit: boolean;
  dotSize: number;
  mergeStyle: MergeStyle;
  mode?: Mode;
  branchesPaths: BranchesPaths<ReactSvgElement>;
  isVertical: boolean;
  isHorizontal: boolean;
  spacing: number;
  commits: Array<Commit<ReactSvgElement>>;
  orientation?: Orientation;
  reverseArrow: boolean;
  commitMessagesX: number;
}

interface CommitYWithOffsetsType {
  [key: number]: number;
}
export const GitgraphUI: React.FunctionComponent<GitgraphUIProps> = (
  props: GitgraphUIProps,
) => {
  const {
    arrowColor,
    arrowOffset,
    arrowSize,
    branchLabelOnEveryCommit,
    branchesPaths,
    commitMessagesX,
    commits,
    dotSize,
    isHorizontal,
    isVertical,
    mergeStyle,
    mode,
    orientation,
    reverseArrow,
    spacing,
  } = props;

  const [commitYWithOffsets, setCommitYWithOffsets] = useState<
    CommitYWithOffsetsType
  >({});
  const [currentCommitOver, setCurrentCommitOver] = useState<Commit<
    ReactSvgElement
  > | null>(null);
  const $graph = useRef<SVGSVGElement>(null);
  const $commits = useRef<SVGGElement>(null);
  let $tooltip: React.ReactElement<SVGGElement> | null = null;

  const commitsElements: {
    [commitHash: string]: {
      branchLabel: React.RefObject<SVGGElement> | null;
      tags: Array<React.RefObject<SVGGElement>>;
      message: React.RefObject<SVGGElement> | null;
    };
  } = {};

  useEffect(
    () => {
      positionCommitsElements();
    },
    [commitYWithOffsets],
  );
  useEffect(
    () => {
      if ($commits.current) {
        const innerCommits = Array.from($commits.current.children);
        setCommitYWithOffsets(computeOffsets(innerCommits, orientation!));
      }
    },
    [commits],
  );

  useEffect(
    () => {
      if ($graph.current) {
        const { height, width } = $graph.current.getBBox();
        $graph.current.setAttribute(
          "width",
          // Add `Tooltip.padding` so we don't crop the tooltip text.
          // Add `BranchLabel.paddingX` so we don't cut branch label.
          (width + Tooltip.padding + BranchLabel.paddingX).toString(),
        );
        $graph.current.setAttribute(
          "height",
          // Add `Tooltip.padding` so we don't crop tooltip text
          // Add `BranchLabel.paddingY` so we don't crop branch label.
          (height + Tooltip.padding + BranchLabel.paddingY).toString(),
        );
      }
    },
    [$graph, commits],
  );

  const getWithCommitOffset = ({ x, y }: Coordinate): Coordinate => {
    return { x, y: commitYWithOffsets[y] || y };
  };

  const renderBranchesPaths = () => {
    const offset = dotSize;
    const isBezier = mergeStyle === MergeStyle.Bezier;
    return Array.from(branchesPaths).map(([branch, coordinates]) => (
      <path
        key={branch.name}
        d={toSvgPath(
          coordinates.map((a) => a.map((b) => getWithCommitOffset(b))),
          isBezier,
          isVertical,
        )}
        fill="transparent"
        stroke={branch.computedColor}
        strokeWidth={branch.style.lineWidth}
        transform={`translate(${offset}, ${offset})`}
      />
    ));
  };

  const renderArrows = (commit: Commit<ReactSvgElement>) => {
    const commitRadius = commit.style.dot.size;

    return commit.parents.map((parentHash) => {
      const parent = commits.find(({ hash }) => hash === parentHash);
      if (!parent) return null;

      // Starting point, relative to commit
      const origin = reverseArrow
        ? {
            x: commitRadius + (parent.x - commit.x),
            y: commitRadius + (parent.y - commit.y),
          }
        : { x: commitRadius, y: commitRadius };

      return (
        <g transform={`translate(${origin.x}, ${origin.y})`}>
          <path
            d={arrowSvgPath(
              {
                arrowSize,
                arrowOffset,
                spacing,
                orientation,
                isVertical,
                reverseArrow,
              } as ArrowSvgPathObject,
              parent,
              commit,
            )}
            fill={arrowColor!}
          />
        </g>
      );
    });
  };

  const renderTooltip = (commit: Commit<ReactSvgElement>) => {
    if (commit.renderTooltip) {
      return commit.renderTooltip(commit);
    }
    return (
      <Tooltip commit={commit}>
        {commit.hashAbbrev} - {commit.subject}
      </Tooltip>
    );
  };

  const renderDot = (commit: Commit<ReactSvgElement>) => {
    if (commit.renderDot) {
      return commit.renderDot(commit);
    }

    return (
      <Dot
        commit={commit}
        onMouseOver={() => {
          setCurrentCommitOver(commit);
          commit.onMouseOver();
        }}
        onMouseOut={() => {
          setCurrentCommitOver(currentCommitOver);
          $tooltip = null;
          commit.onMouseOut();
        }}
      />
    );
  };

  const renderCommit = (commit: Commit<ReactSvgElement>) => {
    const { x, y } = getWithCommitOffset(commit);

    const shouldRenderTooltip =
      currentCommitOver === commit &&
      (isHorizontal ||
        (mode === Mode.Compact && commit.style.hasTooltipInCompactMode));

    if (shouldRenderTooltip) {
      $tooltip = (
        <g key={commit.hashAbbrev} transform={`translate(${x}, ${y})`}>
          {renderTooltip(commit)}
        </g>
      );
    }

    return (
      <g key={commit.hashAbbrev} transform={`translate(${x}, ${y})`}>
        {renderDot(commit)}
        {arrowSize && renderArrows(commit)}

        {/* These elements are positionned after component update. */}
        <g transform={`translate(${-x}, 0)`}>
          {commit.style.message.display && renderMessage(commit)}
          {renderBranchLabels(commit)}
          {renderTags(commit)}
        </g>
      </g>
    );
  };

  const renderMessage = (commit: Commit<ReactSvgElement>) => {
    const ref = createMessageRef(commit);

    if (commit.renderMessage) {
      return <g ref={ref}>{commit.renderMessage(commit)}</g>;
    }

    let body = null;
    if (commit.body) {
      body = (
        <foreignObject width="600" x="10">
          <p>{commit.body}</p>
        </foreignObject>
      );
    }

    // Use commit dot radius to align text with the middle of the dot.
    const y = commit.style.dot.size;

    return (
      <g ref={ref} transform={`translate(0, ${y})`}>
        <text
          alignmentBaseline="central"
          fill={commit.style.message.color}
          style={{ font: commit.style.message.font }}
          onClick={commit.onMessageClick}
        >
          {commit.message}
        </text>
        {body}
      </g>
    );
  };

  const renderTags = (commit: Commit<ReactSvgElement>) => {
    if (!commit.tags) return null;
    if (isHorizontal) return null;

    return commit.tags.map((tag) => {
      const ref = createTagRef(commit);

      return (
        <g
          key={`${commit.hashAbbrev}-${tag.name}`}
          ref={ref}
          transform={`translate(0, ${commit.style.dot.size})`}
        >
          {tag.render ? tag.render(tag.name, tag.style) : <Tag tag={tag} />}
        </g>
      );
    });
  };

  const createBranchLabelRef = (
    commit: Commit<ReactSvgElement>,
  ): React.RefObject<SVGGElement> => {
    const ref = React.createRef<SVGGElement>();

    if (!commitsElements[commit.hashAbbrev]) {
      initCommitElements(commit);
    }

    commitsElements[commit.hashAbbrev].branchLabel = ref;

    return ref;
  };

  const createMessageRef = (
    commit: Commit<ReactSvgElement>,
  ): React.RefObject<SVGGElement> => {
    const ref = React.createRef<SVGGElement>();

    if (!commitsElements[commit.hashAbbrev]) {
      initCommitElements(commit);
    }

    commitsElements[commit.hashAbbrev].message = ref;

    return ref;
  };

  const createTagRef = (
    commit: Commit<ReactSvgElement>,
  ): React.RefObject<SVGGElement> => {
    const ref = React.createRef<SVGGElement>();

    if (!commitsElements[commit.hashAbbrev]) {
      initCommitElements(commit);
    }

    commitsElements[commit.hashAbbrev].tags.push(ref);

    return ref;
  };

  const initCommitElements = (commit: Commit<ReactSvgElement>) => {
    commitsElements[commit.hashAbbrev] = {
      branchLabel: null,
      tags: [],
      message: null,
    };
  };

  const positionCommitsElements = () => {
    if (isHorizontal) {
      // Elements don't appear on horizontal mode, yet.
      return;
    }

    const padding = 10;

    // Ensure commits elements (branch labels, message…) are well positionned.
    // It can't be done at render time since elements size is dynamic.
    Object.keys(commitsElements).forEach((commitHash) => {
      const { branchLabel, tags, message } = commitsElements[commitHash];

      // We'll store X position progressively and translate elements.
      let x = commitMessagesX;

      if (branchLabel && branchLabel.current) {
        moveElement(branchLabel.current, x);

        // For some reason, one paddingX is missing in BBox width.
        const branchLabelWidth =
          branchLabel.current.getBBox().width + BranchLabel.paddingX;
        x += branchLabelWidth + padding;
      }

      tags.forEach((tag) => {
        if (!tag || !tag.current) return;

        moveElement(tag.current, x);

        // For some reason, one paddingX is missing in BBox width.
        const tagWidth = tag.current.getBBox().width + TAG_PADDING_X;
        x += tagWidth + padding;
      });

      if (message && message.current) {
        moveElement(message.current, x);
      }
    });
  };

  const renderBranchLabels = (commit: Commit<ReactSvgElement>) => {
    // @gitgraph/core could compute branch labels into commits directly.
    // That will make it easier to retrieve them, just like tags.
    const branches = Array.from(branchesPaths.keys());
    return branches.map((branch) => {
      if (!branch.style.label.display) return null;

      if (!branchLabelOnEveryCommit) {
        // const commitHash = this.gitgraph.refs.getCommit(branch.name);
        const commitHash = 'asd';
        if (commit.hash !== commitHash) return null;
      }

      // For the moment, we don't handle multiple branch labels.
      // To do so, we'd need to reposition each of them appropriately.
      if (commit.branchToDisplay !== branch.name) return null;

      const ref = createBranchLabelRef(commit);
      const branchLabel = branch.renderLabel ? (
        branch.renderLabel(branch)
      ) : (
        <BranchLabel branch={branch} commit={commit} />
      );

      if (isVertical) {
        return (
          <g key={branch.name} ref={ref}>
            {branchLabel}
          </g>
        );
      } else {
        const commitDotSize = commit.style.dot.size * 2;
        const horizontalMarginTop = 10;
        const y = commitDotSize + horizontalMarginTop;

        return (
          <g
            key={branch.name}
            ref={ref}
            transform={`translate(${commit.x}, ${y})`}
          >
            {branchLabel}
          </g>
        );
      }
    });
  };

  const renderCommits = () => {
    return (
      <g ref={$commits}>{commits.map((commit) => renderCommit(commit))}</g>
    );
  };

  return (
    <svg ref={$graph}>
      {/* Translate graph left => left-most branch label is not cropped (horizontal) */}
      {/* Translate graph down => top-most commit tooltip is not cropped */}
      <g transform={`translate(${BranchLabel.paddingX}, ${Tooltip.padding})`}>
        {renderBranchesPaths()}
        {renderCommits()}
        {$tooltip}
      </g>
    </svg>
  );
};

function moveElement(target: Element, x: number): void {
  const transform = target.getAttribute("transform") || "translate(0, 0)";
  target.setAttribute(
    "transform",
    transform.replace(/translate\(([\d\.]+),/, `translate(${x},`),
  );
}
