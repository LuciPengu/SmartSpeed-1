import cv2
import mediapipe as mp
import numpy as np
from ultralytics import YOLO
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import os
from collections import deque

# --- CONFIGURATION ---
VIDEO_SOURCE = 'sparring.mp4' 
IMPACT_THRESHOLD_RATIO = 0.4b  # Ratio of torso height (40% = close to head)
MODEL_PATH = 'pose_landmarker_heavy.task'
OUTPUT_FOLDER = 'frames'
MIN_PUNCH_SPEED = 0.015
VELOCITY_WINDOW = 5  # Number of frames to track velocity history
# ---------------------

os.makedirs(OUTPUT_FOLDER, exist_ok=True)

print("Loading YOLOv8...")
yolo_model = YOLO('yolov8n.pt') 

base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
options = vision.PoseLandmarkerOptions(
    base_options=base_options,
    running_mode=vision.RunningMode.VIDEO,
    num_poses=2
)
landmarker = vision.PoseLandmarker.create_from_options(options)

def get_2d_distance(p1, p2):
    """Calculate Euclidean distance using normalized 2D coordinates"""
    return np.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2)

def get_torso_height(landmarks):
    """
    Calculate torso height (shoulder to hip midpoint distance)
    This is SCALE-INVARIANT - works regardless of camera distance
    """
    # Shoulder midpoint
    left_shoulder = landmarks[11]
    right_shoulder = landmarks[12]
    shoulder_mid_y = (left_shoulder.y + right_shoulder.y) / 2

    # Hip midpoint
    left_hip = landmarks[23]
    right_hip = landmarks[24]
    hip_mid_y = (left_hip.y + right_hip.y) / 2

    # Torso height (vertical distance)
    torso_height = abs(hip_mid_y - shoulder_mid_y)

    return torso_height

def get_head_size(landmarks):
    """
    Calculate approximate head size (nose to ear distance)
    This gives us the scale of the head
    """
    nose = landmarks[0]
    left_ear = landmarks[7]
    right_ear = landmarks[8]

    # Average distance from nose to ears
    dist_left = get_2d_distance(nose, left_ear)
    dist_right = get_2d_distance(nose, right_ear)

    head_size = (dist_left + dist_right) / 2
    return head_size

class VelocityTracker:
    """Track velocity and acceleration of wrists over time with proper instantaneous calculation"""
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
        """Update position history and calculate instantaneous velocity and acceleration"""
        # Store 2D positions only (x, y) for consistency with distance calculations
        left_pos_2d = np.array([left_pos[0], left_pos[1]])
        right_pos_2d = np.array([right_pos[0], right_pos[1]])

        # Calculate instantaneous velocities if we have at least 2 frames
        if len(self.position_history['left']) >= 1:
            prev_time = list(self.time_history)[-1]
            dt = (timestamp - prev_time) / 1000.0  # Convert to seconds

            # Fallback to frame time if timestamp difference is unreliable
            if dt < 0.001:
                dt = self.frame_time

            if dt > 0.001:  # Avoid division by zero
                # Calculate instantaneous velocity vectors
                left_vel = (left_pos_2d - list(self.position_history['left'])[-1]) / dt
                right_vel = (right_pos_2d - list(self.position_history['right'])[-1]) / dt

                # Calculate acceleration BEFORE appending new velocity
                # We need at least 1 previous velocity to calculate acceleration
                if len(self.velocity_history['left']) >= 1:
                    prev_left_vel = list(self.velocity_history['left'])[-1]
                    prev_right_vel = list(self.velocity_history['right'])[-1]

                    left_accel = (left_vel - prev_left_vel) / dt
                    right_accel = (right_vel - prev_right_vel) / dt

                    self.acceleration_history['left'].append(left_accel)
                    self.acceleration_history['right'].append(right_accel)

                # Now append the new velocities
                self.velocity_history['left'].append(left_vel)
                self.velocity_history['right'].append(right_vel)

        # Store current positions and timestamp
        self.position_history['left'].append(left_pos_2d)
        self.position_history['right'].append(right_pos_2d)
        self.time_history.append(timestamp)

    def get_velocity(self, hand='left'):
        """
        Get smoothed velocity using moving average of instantaneous velocities
        Returns average speed and velocity vector for display
        """
        if len(self.velocity_history[hand]) < 1:
            return 0.0, np.array([0.0, 0.0])

        # Average recent velocities for smoothing noise
        velocities = np.array(list(self.velocity_history[hand]))
        avg_velocity = np.mean(velocities, axis=0)
        speed = np.linalg.norm(avg_velocity)

        return speed, avg_velocity

    def get_peak_velocity(self, hand='left'):
        """
        Get maximum velocity in recent history
        This is better for punch detection as it captures the peak speed
        """
        if len(self.velocity_history[hand]) < 1:
            return 0.0

        velocities = np.array(list(self.velocity_history[hand]))
        speeds = np.linalg.norm(velocities, axis=1)
        return np.max(speeds)

    def get_current_velocity(self, hand='left'):
        """Get the most recent instantaneous velocity (current frame)"""
        if len(self.velocity_history[hand]) < 1:
            return 0.0

        current_vel = list(self.velocity_history[hand])[-1]
        return np.linalg.norm(current_vel)

    def get_acceleration(self, hand='left'):
        """
        Get smoothed acceleration using moving average
        Returns average acceleration magnitude
        """
        if len(self.acceleration_history[hand]) < 1:
            return 0.0, np.array([0.0, 0.0])

        # Average recent accelerations for smoothing noise
        accelerations = np.array(list(self.acceleration_history[hand]))
        avg_acceleration = np.mean(accelerations, axis=0)
        accel_magnitude = np.linalg.norm(avg_acceleration)

        return accel_magnitude, avg_acceleration

    def get_peak_acceleration(self, hand='left'):
        """
        Get maximum acceleration in recent history
        This indicates how explosive the punch is (rate of force development)
        """
        if len(self.acceleration_history[hand]) < 1:
            return 0.0

        accelerations = np.array(list(self.acceleration_history[hand]))
        accel_magnitudes = np.linalg.norm(accelerations, axis=1)
        return np.max(accel_magnitudes)

    def calculate_power_index(self, hand='left'):
        """
        Calculate a 'power index' combining velocity and acceleration
        This better represents knockout potential than velocity alone
        Power Index = Peak Velocity × Peak Acceleration
        """
        peak_vel = self.get_peak_velocity(hand)
        peak_accel = self.get_peak_acceleration(hand)

        # Power index (higher = more knockout potential)
        power_index = peak_vel * peak_accel

        return power_index

cap = cv2.VideoCapture(VIDEO_SOURCE)
fps = cap.get(cv2.CAP_PROP_FPS)

# Validate FPS
if fps <= 0 or fps > 1000:
    print(f"Warning: Invalid FPS detected ({fps}), defaulting to 30.0")
    fps = 30.0

frame_count = 0
impact_count = 0

# Track velocity for each fighter with proper FPS
velocity_trackers = {0: VelocityTracker(VELOCITY_WINDOW, fps), 
                     1: VelocityTracker(VELOCITY_WINDOW, fps)}

# Store impact details for summary
impact_log = []

print(f"Processing video at {fps} fps...")
print(f"Frame time: {1000/fps:.2f} ms per frame")
print(f"Using SCALE-INVARIANT body-part normalization")
print(f"Velocity tracking window: {VELOCITY_WINDOW} frames ({VELOCITY_WINDOW/fps:.3f} seconds)")
print(f"Impact threshold: {IMPACT_THRESHOLD_RATIO} × opponent's torso height")
print(f"Using PEAK VELOCITY for punch detection (more accurate)\n")

while cap.isOpened():
    success, frame = cap.read()
    if not success: 
        break

    timestamp_ms = int(frame_count * (1000 / fps))
    frame_count += 1
    impact_detected = False
    impact_text = ""
    impact_details = {}

    # --- YOLO Detection ---
    yolo_results = yolo_model(frame, classes=0, verbose=False)
    for r in yolo_results:
        for box in r.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)

    # --- MediaPipe Detection ---
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))

    try:
        detection_result = landmarker.detect_for_video(mp_image, timestamp_ms)
    except Exception as e:
        print(f"Error at frame {frame_count}: {e}")
        continue

    # Draw Landmarks
    if detection_result.pose_landmarks:
        for idx, landmarks in enumerate(detection_result.pose_landmarks):
            for landmark in landmarks:
                cx, cy = int(landmark.x * frame.shape[1]), int(landmark.y * frame.shape[0])
                cv2.circle(frame, (cx, cy), 3, (0, 255, 0), -1)

        # Update velocity trackers
        for fighter_idx in [0, 1]:
            if len(detection_result.pose_landmarks) > fighter_idx:
                left_wrist = detection_result.pose_landmarks[fighter_idx][15]
                right_wrist = detection_result.pose_landmarks[fighter_idx][16]

                # Use only 2D coordinates for consistency
                left_pos = np.array([left_wrist.x, left_wrist.y, left_wrist.z])
                right_pos = np.array([right_wrist.x, right_wrist.y, right_wrist.z])

                velocity_trackers[fighter_idx].update(left_pos, right_pos, timestamp_ms)

        # Distance visualization and impact detection
        if len(detection_result.pose_landmarks) >= 2:
            h, w = frame.shape[:2]

            for fighter_idx in [0, 1]:
                opponent_idx = 1 - fighter_idx

                # Get opponent's body measurements for normalization
                try:
                    opponent_torso_height = get_torso_height(detection_result.pose_landmarks[opponent_idx])
                    opponent_head_size = get_head_size(detection_result.pose_landmarks[opponent_idx])
                except:
                    continue

                # Prevent division by zero
                if opponent_torso_height < 0.01 or opponent_head_size < 0.01:
                    continue

                # Use TORSO HEIGHT as the normalization scale (more stable than shoulder width)
                normalization_scale = opponent_torso_height

                # Get wrist positions
                left_wrist = detection_result.pose_landmarks[fighter_idx][15]
                right_wrist = detection_result.pose_landmarks[fighter_idx][16]

                # Get opponent head landmarks
                opponent_nose = detection_result.pose_landmarks[opponent_idx][0]

                # Convert to pixel coordinates
                wrist_l_px = (int(left_wrist.x * w), int(left_wrist.y * h))
                wrist_r_px = (int(right_wrist.x * w), int(right_wrist.y * h))
                nose_px = (int(opponent_nose.x * w), int(opponent_nose.y * h))

                # Calculate raw distances
                dist_left_raw = get_2d_distance(left_wrist, opponent_nose)
                dist_right_raw = get_2d_distance(right_wrist, opponent_nose)

                # NORMALIZE by opponent's torso height (scale-invariant!)
                dist_left_normalized = dist_left_raw / normalization_scale
                dist_right_normalized = dist_right_raw / normalization_scale

                # Get velocities - using PEAK for impact detection, average for display
                left_speed_avg, _ = velocity_trackers[fighter_idx].get_velocity('left')
                right_speed_avg, _ = velocity_trackers[fighter_idx].get_velocity('right')

                left_speed_peak = velocity_trackers[fighter_idx].get_peak_velocity('left')
                right_speed_peak = velocity_trackers[fighter_idx].get_peak_velocity('right')

                # Get accelerations
                left_accel_peak = velocity_trackers[fighter_idx].get_peak_acceleration('left')
                right_accel_peak = velocity_trackers[fighter_idx].get_peak_acceleration('right')

                # Calculate power index (velocity × acceleration = knockout potential)
                left_power_index = velocity_trackers[fighter_idx].calculate_power_index('left')
                right_power_index = velocity_trackers[fighter_idx].calculate_power_index('right')

                # Normalize velocities and accelerations by torso height for scale-invariance
                left_speed_normalized = left_speed_avg / normalization_scale
                right_speed_normalized = right_speed_avg / normalization_scale

                left_peak_normalized = left_speed_peak / normalization_scale
                right_peak_normalized = right_speed_peak / normalization_scale

                # Normalize accelerations
                left_accel_normalized = left_accel_peak / normalization_scale
                right_accel_normalized = right_accel_peak / normalization_scale

                # Normalize power index
                left_power_normalized = left_power_index / (normalization_scale ** 2)
                right_power_normalized = right_power_index / (normalization_scale ** 2)

                # Color coding based on normalized distance
                def get_color(distance):
                    if distance < IMPACT_THRESHOLD_RATIO:
                        return (0, 0, 255)  # Red
                    elif distance < IMPACT_THRESHOLD_RATIO * 1.5:
                        return (0, 165, 255)  # Orange
                    elif distance < IMPACT_THRESHOLD_RATIO * 2:
                        return (0, 255, 255)  # Yellow
                    else:
                        return (0, 255, 0)  # Green

                color_left = get_color(dist_left_normalized)
                color_right = get_color(dist_right_normalized)

                # Draw lines
                cv2.line(frame, wrist_l_px, nose_px, color_left, 2)
                cv2.line(frame, wrist_r_px, nose_px, color_right, 2)

                # Distance and velocity labels (showing average velocity and acceleration)
                mid_left = ((wrist_l_px[0] + nose_px[0]) // 2, (wrist_l_px[1] + nose_px[1]) // 2)
                mid_right = ((wrist_r_px[0] + nose_px[0]) // 2, (wrist_r_px[1] + nose_px[1]) // 2)

                cv2.putText(frame, f"F{fighter_idx+1}L D:{dist_left_normalized:.2f}T V:{left_speed_normalized:.1f} A:{left_accel_normalized:.1f}", 
                           mid_left, cv2.FONT_HERSHEY_SIMPLEX, 0.35, color_left, 2)
                cv2.putText(frame, f"F{fighter_idx+1}R D:{dist_right_normalized:.2f}T V:{right_speed_normalized:.1f} A:{right_accel_normalized:.1f}", 
                           mid_right, cv2.FONT_HERSHEY_SIMPLEX, 0.35, color_right, 2)

                # IMPACT DETECTION: Check all head points (nose, ears) using PEAK velocity
                head_landmarks = [0, 7, 8]

                for head_idx in head_landmarks:
                    opponent_head = detection_result.pose_landmarks[opponent_idx][head_idx]

                    # Left wrist check
                    left_dist_raw = get_2d_distance(left_wrist, opponent_head)
                    left_dist_norm = left_dist_raw / normalization_scale

                    if left_dist_norm < IMPACT_THRESHOLD_RATIO and left_speed_peak > MIN_PUNCH_SPEED:
                        impact_detected = True
                        impact_text = f"Fighter {fighter_idx+1} LEFT PUNCH!"
                        impact_details = {
                            'fighter': fighter_idx + 1,
                            'hand': 'LEFT',
                            'distance': left_dist_norm,
                            'velocity': left_peak_normalized,
                            'velocity_raw': left_speed_peak,
                            'acceleration': left_accel_normalized,
                            'acceleration_raw': left_accel_peak,
                            'power_index': left_power_normalized,
                            'frame': frame_count,
                            'time': timestamp_ms / 1000.0
                        }
                        break

                    # Right wrist check
                    right_dist_raw = get_2d_distance(right_wrist, opponent_head)
                    right_dist_norm = right_dist_raw / normalization_scale

                    if right_dist_norm < IMPACT_THRESHOLD_RATIO and right_speed_peak > MIN_PUNCH_SPEED:
                        impact_detected = True
                        impact_text = f"Fighter {fighter_idx+1} RIGHT PUNCH!"
                        impact_details = {
                            'fighter': fighter_idx + 1,
                            'hand': 'RIGHT',
                            'distance': right_dist_norm,
                            'velocity': right_peak_normalized,
                            'velocity_raw': right_speed_peak,
                            'acceleration': right_accel_normalized,
                            'acceleration_raw': right_accel_peak,
                            'power_index': right_power_normalized,
                            'frame': frame_count,
                            'time': timestamp_ms / 1000.0
                        }
                        break

                if impact_detected:
                    break

            # Display scale info
            cv2.putText(frame, f"D=Distance V=Velocity A=Acceleration (all normalized by Torso)", 
                       (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)

    # Save impact frames
    if impact_detected:
        impact_count += 1
        impact_log.append(impact_details)

        cv2.putText(frame, "IMPACT!", (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 255), 4)
        detail_text = (f"{impact_details['hand']} | V:{impact_details['velocity']:.1f}T/s "
                      f"A:{impact_details['acceleration']:.1f}T/s² | PWR:{impact_details['power_index']:.1f}")
        cv2.putText(frame, detail_text, (50, 140), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

        output_path = os.path.join(OUTPUT_FOLDER, f'impact_{impact_count:03d}_frame_{frame_count:05d}.jpg')
        cv2.imwrite(output_path, frame)
        print(f"Impact {impact_count}: Fighter {impact_details['fighter']} {impact_details['hand']} - "
              f"Vel: {impact_details['velocity']:.2f}T/s, Accel: {impact_details['acceleration']:.2f}T/s², "
              f"Power: {impact_details['power_index']:.2f}")

    # Progress
    if frame_count % 100 == 0:
        print(f"Processed {frame_count} frames...")

cap.release()
landmarker.close()

# Generate summary statistics
print(f"\n{'='*60}")
print(f"Processing Complete!")
print(f"Video FPS: {fps}")
print(f"Total frames: {frame_count}")
print(f"Total duration: {frame_count/fps:.2f} seconds")
print(f"Impacts detected: {impact_count}")
print(f"Frames saved to: {OUTPUT_FOLDER}/")
print(f"\n{'='*60}")
print(f"IMPACT SUMMARY (Velocity + Acceleration + Power Index)")
print(f"{'='*60}")

if impact_log:
    for i, impact in enumerate(impact_log, 1):
        print(f"{i:2d}. Frame {impact['frame']:5d} ({impact['time']:6.2f}s) | "
              f"F{impact['fighter']} {impact['hand']:5s} | "
              f"V:{impact['velocity']:5.2f}T/s A:{impact['acceleration']:5.2f}T/s² "
              f"PWR:{impact['power_index']:6.2f}")

    print(f"\n{'='*60}")
    print(f"STATISTICS")
    print(f"{'='*60}")

    velocities = [imp['velocity'] for imp in impact_log]
    accelerations = [imp['acceleration'] for imp in impact_log]
    power_indices = [imp['power_index'] for imp in impact_log]

    print(f"\nVelocity (T/s):")
    print(f"  Average: {np.mean(velocities):.2f} | Max: {np.max(velocities):.2f} | Min: {np.min(velocities):.2f}")

    print(f"\nAcceleration (T/s²):")
    print(f"  Average: {np.mean(accelerations):.2f} | Max: {np.max(accelerations):.2f} | Min: {np.min(accelerations):.2f}")

    print(f"\nPower Index (V×A):")
    print(f"  Average: {np.mean(power_indices):.2f} | Max: {np.max(power_indices):.2f} | Min: {np.min(power_indices):.2f}")

    # Per fighter stats
    for fighter_num in [1, 2]:
        fighter_impacts = [imp for imp in impact_log if imp['fighter'] == fighter_num]
        if fighter_impacts:
            fighter_vels = [imp['velocity'] for imp in fighter_impacts]
            fighter_accels = [imp['acceleration'] for imp in fighter_impacts]
            fighter_power = [imp['power_index'] for imp in fighter_impacts]
            print(f"\nFighter {fighter_num}: {len(fighter_impacts)} punches")
            print(f"  Avg Velocity: {np.mean(fighter_vels):.2f}T/s | Max: {np.max(fighter_vels):.2f}T/s")
            print(f"  Avg Accel: {np.mean(fighter_accels):.2f}T/s² | Max: {np.max(fighter_accels):.2f}T/s²")
            print(f"  Avg Power: {np.mean(fighter_power):.2f} | Max: {np.max(fighter_power):.2f}")

print(f"\n{'='*60}")
print(f"POWER INDEX = Velocity × Acceleration")
print(f"Higher power index = greater knockout potential")
print(f"Acceleration shows 'explosiveness' - how fast the punch reaches peak speed")
print(f"{'='*60}")