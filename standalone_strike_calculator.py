#!/usr/bin/env python3
"""
Hitsmart Strike Calculator - Standalone Version
Analyzes sparring/boxing footage to detect punch impacts and saves impact frames.

Requirements:
    pip install opencv-python mediapipe numpy

Usage:
    python standalone_strike_calculator.py input_video.mp4
    python standalone_strike_calculator.py input_video.mp4 --output frames_output
    python standalone_strike_calculator.py input_video.mp4 --threshold 0.4 --max-frames 500

The script will:
1. Process the video frame by frame
2. Detect two fighters using MediaPipe pose estimation
3. Track wrist velocities and accelerations
4. Detect when a punch impacts the opponent's head area
5. Save annotated impact frames to the output folder
6. Print a detailed summary with statistics
"""

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import os
import sys
import argparse
from collections import deque


MODEL_FILENAME = "pose_landmarker_heavy.task"


def download_model(model_path):
    print(f"Pose model not found at: {model_path}")
    print("Downloading pose_landmarker_heavy.task (~30MB)...")
    import urllib.request
    url = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task"
    try:
        urllib.request.urlretrieve(url, model_path)
        print("Download complete!")
    except Exception as e:
        print(f"Download failed: {e}")
        print(f"Please download the model manually from:\n  {url}")
        print(f"And place it at: {model_path}")
        sys.exit(1)


class VelocityTracker:
    def __init__(self, window_size=5, fps=30.0):
        self.window_size = window_size
        self.fps = fps
        self.frame_time = 1.0 / fps
        self.position_history = {
            'left': deque(maxlen=window_size),
            'right': deque(maxlen=window_size)
        }
        self.time_history = deque(maxlen=window_size)
        self.velocity_history = {
            'left': deque(maxlen=window_size),
            'right': deque(maxlen=window_size)
        }
        self.acceleration_history = {
            'left': deque(maxlen=window_size),
            'right': deque(maxlen=window_size)
        }

    def update(self, left_pos, right_pos, timestamp):
        left_pos_2d = np.array([left_pos[0], left_pos[1]])
        right_pos_2d = np.array([right_pos[0], right_pos[1]])

        if len(self.position_history['left']) >= 1:
            prev_time = list(self.time_history)[-1]
            dt = (timestamp - prev_time) / 1000.0

            if dt < 0.001:
                dt = self.frame_time

            if dt > 0.001:
                left_vel = (left_pos_2d - list(self.position_history['left'])[-1]) / dt
                right_vel = (right_pos_2d - list(self.position_history['right'])[-1]) / dt

                if len(self.velocity_history['left']) >= 1:
                    prev_left_vel = list(self.velocity_history['left'])[-1]
                    prev_right_vel = list(self.velocity_history['right'])[-1]

                    left_accel = (left_vel - prev_left_vel) / dt
                    right_accel = (right_vel - prev_right_vel) / dt

                    self.acceleration_history['left'].append(left_accel)
                    self.acceleration_history['right'].append(right_accel)

                self.velocity_history['left'].append(left_vel)
                self.velocity_history['right'].append(right_vel)

        self.position_history['left'].append(left_pos_2d)
        self.position_history['right'].append(right_pos_2d)
        self.time_history.append(timestamp)

    def get_peak_velocity(self, hand='left'):
        if len(self.velocity_history[hand]) < 1:
            return 0.0
        velocities = np.array(list(self.velocity_history[hand]))
        speeds = np.linalg.norm(velocities, axis=1)
        return np.max(speeds)

    def get_peak_acceleration(self, hand='left'):
        if len(self.acceleration_history[hand]) < 1:
            return 0.0
        accelerations = np.array(list(self.acceleration_history[hand]))
        accel_magnitudes = np.linalg.norm(accelerations, axis=1)
        return np.max(accel_magnitudes)

    def calculate_power_index(self, hand='left'):
        peak_vel = self.get_peak_velocity(hand)
        peak_accel = self.get_peak_acceleration(hand)
        return peak_vel * peak_accel


def get_2d_distance(p1, p2):
    return np.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2)


def get_torso_height(landmarks):
    left_shoulder = landmarks[11]
    right_shoulder = landmarks[12]
    shoulder_mid_y = (left_shoulder.y + right_shoulder.y) / 2
    left_hip = landmarks[23]
    right_hip = landmarks[24]
    hip_mid_y = (left_hip.y + right_hip.y) / 2
    return abs(hip_mid_y - shoulder_mid_y)


def get_head_size(landmarks):
    nose = landmarks[0]
    left_ear = landmarks[7]
    right_ear = landmarks[8]
    dist_left = get_2d_distance(nose, left_ear)
    dist_right = get_2d_distance(nose, right_ear)
    return (dist_left + dist_right) / 2


def draw_pose_landmarks(frame, landmarks, color=(0, 255, 0)):
    h, w = frame.shape[:2]
    connections = [
        (11, 12), (11, 13), (13, 15), (12, 14), (14, 16),
        (11, 23), (12, 24), (23, 24), (23, 25), (25, 27),
        (24, 26), (26, 28), (0, 11), (0, 12)
    ]
    for landmark in landmarks:
        cx, cy = int(landmark.x * w), int(landmark.y * h)
        cv2.circle(frame, (cx, cy), 3, color, -1)
    for start, end in connections:
        if start < len(landmarks) and end < len(landmarks):
            p1 = (int(landmarks[start].x * w), int(landmarks[start].y * h))
            p2 = (int(landmarks[end].x * w), int(landmarks[end].y * h))
            cv2.line(frame, p1, p2, color, 2)


def analyze_video(video_path, output_folder, impact_threshold=0.35,
                  min_punch_speed=0.015, velocity_window=5, max_frames=300,
                  target_fps=30.0, target_width=640):

    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(script_dir, MODEL_FILENAME)

    if not os.path.exists(model_path):
        download_model(model_path)

    if not os.path.exists(video_path):
        print(f"Error: Video file not found: {video_path}")
        sys.exit(1)

    os.makedirs(output_folder, exist_ok=True)

    base_options = python.BaseOptions(model_asset_path=model_path)
    options = vision.PoseLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.VIDEO,
        num_poses=2
    )
    landmarker = vision.PoseLandmarker.create_from_options(options)

    cap = cv2.VideoCapture(video_path)
    original_fps = cap.get(cv2.CAP_PROP_FPS)
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames_in_video = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    if original_fps <= 0 or original_fps > 1000:
        original_fps = 30.0

    frame_interval = original_fps / target_fps
    fps = target_fps

    scale_factor = target_width / frame_width if frame_width > target_width else 1.0
    scaled_height = int(frame_height * scale_factor)
    scaled_width = int(frame_width * scale_factor)

    duration = total_frames_in_video / original_fps if original_fps > 0 else 0

    print(f"\n{'='*60}")
    print(f"HITSMART STRIKE CALCULATOR")
    print(f"{'='*60}")
    print(f"Input:      {video_path}")
    print(f"Output:     {output_folder}/")
    print(f"Resolution: {frame_width}x{frame_height}")
    print(f"FPS:        {original_fps:.1f} (processing at {target_fps:.0f})")
    print(f"Duration:   {duration:.1f}s ({total_frames_in_video} frames)")
    print(f"Max frames: {max_frames}")
    if scale_factor < 1.0:
        print(f"Resizing:   {frame_width}x{frame_height} -> {scaled_width}x{scaled_height}")
    print(f"Threshold:  {impact_threshold}")
    print(f"{'='*60}\n")

    frame_count = 0
    raw_frame_index = 0
    impact_count = 0
    velocity_trackers = {0: VelocityTracker(velocity_window, fps),
                         1: VelocityTracker(velocity_window, fps)}
    impact_log = []

    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            break

        target_frame = int(frame_count * frame_interval)
        if raw_frame_index < target_frame:
            raw_frame_index += 1
            continue

        if frame_count >= max_frames:
            print(f"Reached max frame limit ({max_frames})")
            break

        raw_frame_index += 1

        if scale_factor < 1.0:
            frame = cv2.resize(frame, (scaled_width, scaled_height), interpolation=cv2.INTER_AREA)

        timestamp_ms = int(frame_count * (1000 / fps))
        frame_count += 1
        impact_detected = False
        impact_details = {}

        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))

        try:
            detection_result = landmarker.detect_for_video(mp_image, timestamp_ms)
        except Exception:
            continue

        if detection_result.pose_landmarks:
            colors = [(0, 255, 0), (255, 0, 0)]
            for idx, landmarks in enumerate(detection_result.pose_landmarks):
                color = colors[idx % len(colors)]
                draw_pose_landmarks(frame, landmarks, color)

            for fighter_idx in [0, 1]:
                if len(detection_result.pose_landmarks) > fighter_idx:
                    left_wrist = detection_result.pose_landmarks[fighter_idx][15]
                    right_wrist = detection_result.pose_landmarks[fighter_idx][16]
                    left_pos = np.array([left_wrist.x, left_wrist.y, left_wrist.z])
                    right_pos = np.array([right_wrist.x, right_wrist.y, right_wrist.z])
                    velocity_trackers[fighter_idx].update(left_pos, right_pos, timestamp_ms)

            if len(detection_result.pose_landmarks) >= 2:
                h, w = frame.shape[:2]

                for fighter_idx in [0, 1]:
                    opponent_idx = 1 - fighter_idx

                    try:
                        opponent_torso_height = get_torso_height(detection_result.pose_landmarks[opponent_idx])
                        opponent_head_size = get_head_size(detection_result.pose_landmarks[opponent_idx])
                    except Exception:
                        continue

                    if opponent_torso_height < 0.01 or opponent_head_size < 0.01:
                        continue

                    normalization_scale = opponent_torso_height

                    left_wrist = detection_result.pose_landmarks[fighter_idx][15]
                    right_wrist = detection_result.pose_landmarks[fighter_idx][16]
                    opponent_nose = detection_result.pose_landmarks[opponent_idx][0]

                    wrist_l_px = (int(left_wrist.x * w), int(left_wrist.y * h))
                    wrist_r_px = (int(right_wrist.x * w), int(right_wrist.y * h))
                    nose_px = (int(opponent_nose.x * w), int(opponent_nose.y * h))

                    dist_left_raw = get_2d_distance(left_wrist, opponent_nose)
                    dist_right_raw = get_2d_distance(right_wrist, opponent_nose)
                    dist_left_normalized = dist_left_raw / normalization_scale
                    dist_right_normalized = dist_right_raw / normalization_scale

                    left_speed_peak = velocity_trackers[fighter_idx].get_peak_velocity('left')
                    right_speed_peak = velocity_trackers[fighter_idx].get_peak_velocity('right')
                    left_accel_peak = velocity_trackers[fighter_idx].get_peak_acceleration('left')
                    right_accel_peak = velocity_trackers[fighter_idx].get_peak_acceleration('right')
                    left_power_index = velocity_trackers[fighter_idx].calculate_power_index('left')
                    right_power_index = velocity_trackers[fighter_idx].calculate_power_index('right')

                    left_peak_normalized = left_speed_peak / normalization_scale
                    right_peak_normalized = right_speed_peak / normalization_scale
                    left_accel_normalized = left_accel_peak / normalization_scale
                    right_accel_normalized = right_accel_peak / normalization_scale
                    left_power_normalized = left_power_index / (normalization_scale ** 2)
                    right_power_normalized = right_power_index / (normalization_scale ** 2)

                    def get_color(distance):
                        if distance < impact_threshold:
                            return (0, 0, 255)
                        elif distance < impact_threshold * 1.5:
                            return (0, 165, 255)
                        elif distance < impact_threshold * 2:
                            return (0, 255, 255)
                        else:
                            return (0, 255, 0)

                    color_left = get_color(dist_left_normalized)
                    color_right = get_color(dist_right_normalized)

                    cv2.line(frame, wrist_l_px, nose_px, color_left, 2)
                    cv2.line(frame, wrist_r_px, nose_px, color_right, 2)

                    head_landmarks = [0, 7, 8]

                    for head_idx in head_landmarks:
                        opponent_head = detection_result.pose_landmarks[opponent_idx][head_idx]

                        left_dist_raw = get_2d_distance(left_wrist, opponent_head)
                        left_dist_norm = left_dist_raw / normalization_scale

                        if left_dist_norm < impact_threshold and left_speed_peak > min_punch_speed:
                            impact_detected = True
                            motion_intensity = min(1.0, left_speed_peak / 0.15)
                            impact_details = {
                                'fighter': fighter_idx + 1,
                                'hand': 'LEFT',
                                'distance': float(left_dist_norm),
                                'velocity': float(left_peak_normalized),
                                'velocity_raw': float(left_speed_peak),
                                'acceleration': float(left_accel_normalized),
                                'acceleration_raw': float(left_accel_peak),
                                'power_index': float(left_power_normalized),
                                'motion_intensity': float(motion_intensity),
                                'frame': frame_count,
                                'time': timestamp_ms / 1000.0
                            }
                            break

                        right_dist_raw = get_2d_distance(right_wrist, opponent_head)
                        right_dist_norm = right_dist_raw / normalization_scale

                        if right_dist_norm < impact_threshold and right_speed_peak > min_punch_speed:
                            impact_detected = True
                            motion_intensity = min(1.0, right_speed_peak / 0.15)
                            impact_details = {
                                'fighter': fighter_idx + 1,
                                'hand': 'RIGHT',
                                'distance': float(right_dist_norm),
                                'velocity': float(right_peak_normalized),
                                'velocity_raw': float(right_speed_peak),
                                'acceleration': float(right_accel_normalized),
                                'acceleration_raw': float(right_accel_peak),
                                'power_index': float(right_power_normalized),
                                'motion_intensity': float(motion_intensity),
                                'frame': frame_count,
                                'time': timestamp_ms / 1000.0
                            }
                            break

                    if impact_detected:
                        break

        if impact_detected:
            impact_count += 1

            cv2.putText(frame, "IMPACT!", (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 255), 4)
            detail_text = (f"F{impact_details['fighter']} {impact_details['hand']} | "
                          f"V:{impact_details['velocity']:.1f}T/s "
                          f"A:{impact_details['acceleration']:.1f}T/s2 "
                          f"PWR:{impact_details['power_index']:.1f}")
            cv2.putText(frame, detail_text, (50, 140), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

            filename = f'impact_{impact_count:03d}_frame_{frame_count:05d}.jpg'
            output_path = os.path.join(output_folder, filename)
            cv2.imwrite(output_path, frame)

            print(f"  Impact {impact_count:3d}: F{impact_details['fighter']} {impact_details['hand']:5s} "
                  f"@ {impact_details['time']:6.2f}s | "
                  f"V:{impact_details['velocity']:5.2f}T/s "
                  f"A:{impact_details['acceleration']:5.2f}T/s2 "
                  f"PWR:{impact_details['power_index']:6.2f}")

            impact_log.append(impact_details)

        if frame_count % 50 == 0:
            pct = min(100, (frame_count / max_frames) * 100)
            print(f"  Processing... {frame_count}/{max_frames} frames ({pct:.0f}%)")

    cap.release()
    landmarker.close()

    print(f"\n{'='*60}")
    print(f"RESULTS")
    print(f"{'='*60}")
    print(f"Frames processed: {frame_count}")
    print(f"Duration analyzed: {frame_count / fps:.2f}s")
    print(f"Impacts detected: {impact_count}")
    print(f"Frames saved to:  {output_folder}/")

    if impact_log:
        print(f"\n{'='*60}")
        print(f"STATISTICS")
        print(f"{'='*60}")

        velocities = [imp['velocity'] for imp in impact_log]
        accelerations = [imp['acceleration'] for imp in impact_log]
        power_indices = [imp['power_index'] for imp in impact_log]

        print(f"\nVelocity (T/s):")
        print(f"  Average: {np.mean(velocities):.2f} | Max: {np.max(velocities):.2f} | Min: {np.min(velocities):.2f}")

        print(f"\nAcceleration (T/s2):")
        print(f"  Average: {np.mean(accelerations):.2f} | Max: {np.max(accelerations):.2f} | Min: {np.min(accelerations):.2f}")

        print(f"\nPower Index (V x A):")
        print(f"  Average: {np.mean(power_indices):.2f} | Max: {np.max(power_indices):.2f} | Min: {np.min(power_indices):.2f}")

        for fighter_num in [1, 2]:
            fighter_impacts = [imp for imp in impact_log if imp['fighter'] == fighter_num]
            if fighter_impacts:
                f_vels = [imp['velocity'] for imp in fighter_impacts]
                f_accels = [imp['acceleration'] for imp in fighter_impacts]
                f_power = [imp['power_index'] for imp in fighter_impacts]
                print(f"\n  Fighter {fighter_num}: {len(fighter_impacts)} punches landed")
                print(f"    Avg Velocity: {np.mean(f_vels):.2f}T/s | Max: {np.max(f_vels):.2f}T/s")
                print(f"    Avg Accel:    {np.mean(f_accels):.2f}T/s2 | Max: {np.max(f_accels):.2f}T/s2")
                print(f"    Avg Power:    {np.mean(f_power):.2f} | Max: {np.max(f_power):.2f}")
    else:
        print("\nNo impacts detected. Try adjusting --threshold (higher = more sensitive).")

    print(f"\n{'='*60}")
    print(f"Done! Check '{output_folder}/' for impact frame images.")
    print(f"{'='*60}\n")

    return impact_log


def main():
    parser = argparse.ArgumentParser(
        description="Hitsmart Strike Calculator - Analyze sparring footage for punch impacts",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python standalone_strike_calculator.py sparring.mp4
  python standalone_strike_calculator.py fight.mov --output my_frames
  python standalone_strike_calculator.py video.mp4 --threshold 0.4 --max-frames 500
  python standalone_strike_calculator.py video.mp4 --fps 15 --width 480
        """
    )
    parser.add_argument("video", help="Path to the input video file (MP4, AVI, MOV, MKV)")
    parser.add_argument("--output", "-o", default="impact_frames",
                        help="Output folder for impact frames (default: impact_frames)")
    parser.add_argument("--threshold", "-t", type=float, default=0.35,
                        help="Impact distance threshold as ratio of torso height (default: 0.35, higher = more sensitive)")
    parser.add_argument("--min-speed", type=float, default=0.015,
                        help="Minimum punch speed to register (default: 0.015)")
    parser.add_argument("--max-frames", "-m", type=int, default=300,
                        help="Maximum frames to process (default: 300)")
    parser.add_argument("--fps", type=float, default=30.0,
                        help="Target processing FPS (default: 30)")
    parser.add_argument("--width", "-w", type=int, default=640,
                        help="Target frame width for processing (default: 640)")
    parser.add_argument("--velocity-window", type=int, default=5,
                        help="Velocity tracking window in frames (default: 5)")

    args = parser.parse_args()

    analyze_video(
        video_path=args.video,
        output_folder=args.output,
        impact_threshold=args.threshold,
        min_punch_speed=args.min_speed,
        velocity_window=args.velocity_window,
        max_frames=args.max_frames,
        target_fps=args.fps,
        target_width=args.width
    )


if __name__ == "__main__":
    main()
