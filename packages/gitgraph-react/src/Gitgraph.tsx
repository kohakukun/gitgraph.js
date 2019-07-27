import * as React from "react";
import {
  GitgraphCore,
  GitgraphOptions,
  GitgraphUserApi,
  GitgraphCommitOptions,
  GitgraphBranchOptions,
  GitgraphTagOptions,
  GitgraphMergeOptions,
  BranchUserApi,
  Commit,
  MergeStyle,
  Mode,
  Orientation,
  TemplateName,
  templateExtend,
  BranchesPaths,
} from "@gitgraph/core";

import { GitgraphUI, ReactSvgElement } from "./GitgraphUI";

type CommitOptions = GitgraphCommitOptions<ReactSvgElement>;
type BranchOptions = GitgraphBranchOptions<ReactSvgElement>;
type TagOptions = GitgraphTagOptions<ReactSvgElement>;
type MergeOptions = GitgraphMergeOptions<ReactSvgElement>;
type Branch = BranchUserApi<ReactSvgElement>;

export {
  Gitgraph,
  GitgraphProps,
  GitgraphState,
  CommitOptions,
  BranchOptions,
  TagOptions,
  MergeOptions,
  Branch,
  TemplateName,
  templateExtend,
  MergeStyle,
  Mode,
  Orientation,
};

interface GitgraphProps {
  options?: GitgraphOptions;
  /**
   * git graph
   */
  gitgraph?: GitgraphCore<ReactSvgElement>;
  children: (gitgraph: GitgraphUserApi<ReactSvgElement>) => void;
}

interface GitgraphState {
  commits: Array<Commit<ReactSvgElement>>;
  branchesPaths: BranchesPaths<ReactSvgElement>;
  commitMessagesX: number;
  // Store a map to replace commits y with the correct value,
  // including the message offset. Allows custom, flexible message height.
  // E.g. {20: 30} means for commit: y=20 -> y=30
  // Offset should be computed when graph is rendered (componentDidUpdate).
  commitYWithOffsets: { [key: number]: number };
}

class Gitgraph extends React.Component<GitgraphProps, GitgraphState> {
  public static defaultProps: Partial<GitgraphProps> = {
    options: {},
  };

  private gitgraph: GitgraphCore<ReactSvgElement>;
  private handler?: () => void;

  constructor(props: GitgraphProps) {
    super(props);
    this.state = {
      commits: [],
      branchesPaths: new Map(),
      commitMessagesX: 0,
      commitYWithOffsets: {},
    };
    this.gitgraph =
      this.props.gitgraph || new GitgraphCore<ReactSvgElement>(props.options);
  }

  public render() {
    const { branchesPaths, commits, commitMessagesX } = this.state;
    return (
      <GitgraphUI
        arrowSize={this.gitgraph.template.arrow.size}
        arrowColor={this.gitgraph.template.arrow.color}
        arrowOffset={this.gitgraph.template.arrow.offset}
        branchLabelOnEveryCommit={false}
        dotSize={this.gitgraph.template.commit.dot.size}
        mergeStyle={this.gitgraph.template.branch.mergeStyle}
        mode={this.gitgraph.mode}
        branchesPaths={branchesPaths}
        isVertical={this.gitgraph.isVertical}
        isHorizontal={this.gitgraph.isHorizontal}
        spacing={this.gitgraph.template.commit.spacing}
        commits={commits}
        orientation={this.gitgraph.orientation}
        reverseArrow={this.gitgraph.reverseArrow}
        commitMessagesX={commitMessagesX}
      />
    );
  }

  public componentDidMount() {
    this.handler = this.gitgraph.subscribe((data) => {
      const { commits, branchesPaths, commitMessagesX } = data;
      this.setState({
        commits,
        branchesPaths,
        commitMessagesX,
      });
    });
    this.props.children(this.gitgraph.getUserApi());
  }

  public componentWillUnmount() {
    if (this.handler) {
      this.handler();
    }
  }

  public componentDidUpdate(
    prevProps: GitgraphProps,
    prevState: GitgraphState,
  ) {
    if (this.props.gitgraph && prevProps.gitgraph !== this.props.gitgraph) {
      // need to reset everything
      this.setState({
        commits: [],
        branchesPaths: new Map(),
        commitMessagesX: 0,
        commitYWithOffsets: {},
      });
      return;
    }
  }
}
