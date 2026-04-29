/**
 * PasswordStrengthBar
 *
 * Visual password strength indicator.
 * Checks: length ≥ 8, uppercase, number, special character.
 */
import React from 'react';
import { Progress, Typography } from 'antd';

const { Text } = Typography;

interface Rule {
  label: string;
  test: (pw: string) => boolean;
}

const RULES: Rule[] = [
  { label: 'At least 8 characters',          test: (pw) => pw.length >= 8          },
  { label: 'Uppercase letter (A–Z)',          test: (pw) => /[A-Z]/.test(pw)        },
  { label: 'Number (0–9)',                    test: (pw) => /[0-9]/.test(pw)        },
  { label: 'Special character (!@#$%…)',      test: (pw) => /[^A-Za-z0-9]/.test(pw)},
];

function getStrength(pw: string): { score: number; label: string; color: string } {
  const passed = RULES.filter((r) => r.test(pw)).length;
  if (passed === 0) return { score: 0,   label: '',        color: '#d9d9d9' };
  if (passed === 1) return { score: 25,  label: 'Weak',    color: '#ff4d4f' };
  if (passed === 2) return { score: 50,  label: 'Fair',    color: '#faad14' };
  if (passed === 3) return { score: 75,  label: 'Good',    color: '#52c41a' };
  return               { score: 100, label: 'Strong',  color: '#1677ff' };
}

interface Props {
  password: string;
  showRules?: boolean;
}

export const PasswordStrengthBar: React.FC<Props> = ({ password, showRules = true }) => {
  if (!password) return null;

  const { score, label, color } = getStrength(password);

  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Progress
          percent={score}
          showInfo={false}
          strokeColor={color}
          trailColor="#f0f0f0"
          size="small"
          style={{ flex: 1, marginBottom: 0 }}
        />
        <Text style={{ color, fontSize: 12, minWidth: 48 }}>{label}</Text>
      </div>

      {showRules && (
        <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12 }}>
          {RULES.map((rule) => {
            const ok = rule.test(password);
            return (
              <li key={rule.label} style={{ color: ok ? '#52c41a' : '#ff4d4f', lineHeight: '1.6' }}>
                {ok ? '✓' : '✗'} {rule.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default PasswordStrengthBar;
