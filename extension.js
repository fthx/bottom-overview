/*
    Bottom Overview
    GNOME Shell 45+ extension
    @fthx 2025
*/


import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import * as Layout from 'resource:///org/gnome/shell/ui/layout.js'
import * as Main from 'resource:///org/gnome/shell/ui/main.js';


const PRESSURE_THRESHOLD = 150; // px
const HOT_EDGE_PRESSURE_TIMEOUT = 1000; // ms

const BottomOverview = GObject.registerClass(
    class BottomOverview extends Clutter.Actor {
        _init() {
            super._init();

            this._initPressureBarrier();
            this._setHotEdges();

            Main.layoutManager.connectObject('hot-corners-changed', () => this._setHotEdges(), this);
        }

        _initPressureBarrier() {
            this._pressureBarrier = new Layout.PressureBarrier(
                PRESSURE_THRESHOLD,
                HOT_EDGE_PRESSURE_TIMEOUT,
                Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW);

            this._pressureBarrier?.connectObject('trigger', () => Main.overview.toggle(), this);
        }

        _setBarriers() {
            const monitors = Main.layoutManager.monitors;

            for (const monitor of monitors) {
                const barrier = new Meta.Barrier({
                    backend: global.backend,
                    x1: monitor.x,
                    y1: monitor.y + monitor.height,
                    x2: monitor.x + monitor.width,
                    y2: monitor.y + monitor.height,
                    directions: Meta.BarrierDirection.NEGATIVE_Y
                });

                this._pressureBarrier?.addBarrier(barrier);
            }
        }

        _setHotEdges() {
            this._destroyBarriers();

            if (this._hotEdgeTimeout)
                GLib.Source.remove(this._hotEdgeTimeout);

            this._hotEdgeTimeout = GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                this._setBarriers();

                this._hotEdgeTimeout = null;
                return GLib.SOURCE_REMOVE;
            });
        }

        _destroyBarriers() {
            for (let barrier of this._pressureBarrier?._barriers) {
                this._pressureBarrier?.removeBarrier(barrier);
                barrier?.destroy();
                barrier = null;
            }
        }

        _destroyPressureBarrier() {
            this._pressureBarrier?.disconnectObject(this);
            this._pressureBarrier?.destroy();
            this._pressureBarrier = null;
        }

        destroy() {
            if (this._hotEdgeTimeout) {
                GLib.Source.remove(this._hotEdgeTimeout);
                this._hotEdgeTimeout = null;
            }

            Main.layoutManager.disconnectObject(this);
            this._destroyBarriers();
            this._destroyPressureBarrier();

            super.destroy();
        }
    });

export default class BottomOverviewExtension {
    /*_updateHotEdges() {
        Main.layoutManager._destroyHotCorners();

        for (let i = 0; i < Main.layoutManager.monitors.length; i++) {
            let monitor = Main.layoutManager.monitors[i];
            let leftX = monitor.x;
            let rightX = monitor.x + monitor.width;
            let bottomY = monitor.y + monitor.height;
            let size = monitor.width;

            let haveBottom = true;

            for (let j = 0; j < Main.layoutManager.monitors.length; j++) {
                if (j != i) {
                    let otherMonitor = Main.layoutManager.monitors[j];
                    let otherLeftX = otherMonitor.x;
                    let otherRightX = otherMonitor.x + otherMonitor.width;
                    let otherTopY = otherMonitor.y;
                    if (otherTopY >= bottomY && otherLeftX < rightX && otherRightX > leftX)
                        haveBottom = false;
                }
            }

            if (haveBottom) {
                let edge = new BottomOverview(monitor, leftX, bottomY);

                edge.setBarrierSize(size);
                Main.layoutManager.hotCorners.push(edge);
            } else
                Main.layoutManager.hotCorners.push(null);
        }
    }*/

    enable() {
        this._bottomOverview = new BottomOverview();
    }

    disable() {
        this._bottomOverview?.destroy();
        this._bottomOverview = null;
    }
}
