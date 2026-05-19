# Phase 20: Calibrate High Review Signals and Reduce False Positives in Player Analysis

Status: Planned

## Goal

Fix inflated high review signals by calibrating the player-specific detection pipeline against real demo behavior, feature evidence, and conservative research-signal thresholds.

## Problem

The pipeline now attributes analysis results to individual SteamIDs instead of a demo-wide aggregate, but current extractor outputs can still produce high review signals for nearly every parsed player. This phase focuses on reducing false positives while preserving explainable, player-specific, research-only output.

## Planning Anchor

Execute:

```bash
$gsd-execute-phase 20
```
