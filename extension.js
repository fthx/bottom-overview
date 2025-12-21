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
const HOT_EDGE_PRESSURE_TIMEOUT = 500; // ms

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
                let hasBottom = true;

                for (const otherMonitor of monitors) {
                    if (otherMonitor === monitor)
                        continue;

                    if (otherMonitor.y >= monitor.y + monitor.height
                        && otherMonitor.x < monitor.x + monitor.width
                        && otherMonitor.x + otherMonitor.width > monitor.x)
                        hasBottom = false;
                }

                if (hasBottom) {
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
    enable() {
        this._bottomOverview = new BottomOverview();
    }

    disable() {
        this._bottomOverview?.destroy();
        this._bottomOverview = null;
    }
}
